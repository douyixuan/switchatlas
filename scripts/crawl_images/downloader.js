const fs = require('node:fs')
const path = require('node:path')
const { get } = require('./lib/http')

// Simple per-host token bucket: at most 1 request per `intervalMs`.
class RateLimiter {
  constructor(intervalMs = 1100) {
    this.intervalMs = intervalMs
    this.lastByHost = new Map()
  }
  async wait(host) {
    const now = Date.now()
    const last = this.lastByHost.get(host) || 0
    const elapsed = now - last
    if (elapsed < this.intervalMs) {
      await new Promise((r) => setTimeout(r, this.intervalMs - elapsed))
    }
    this.lastByHost.set(host, Date.now())
  }
}

// Parse a robots.txt body and return a function that, given a path, says
// whether our UA is allowed. Falls back to permissive if the file can't be
// parsed (treat any 4xx as "no rules").
function compileRobots(text, ua = 'SwitchAtlasCrawler') {
  if (!text) return () => true
  const lines = text.split(/\r?\n/).map((l) => l.replace(/#.*$/, '').trim())
  const groups = []
  let current = null
  for (const line of lines) {
    if (!line) continue
    const [rawKey, ...rest] = line.split(':')
    if (!rawKey || rest.length === 0) continue
    const key = rawKey.trim().toLowerCase()
    const value = rest.join(':').trim()
    if (key === 'user-agent') {
      if (!current || current.rules.length > 0) {
        current = { agents: [value.toLowerCase()], rules: [] }
        groups.push(current)
      } else {
        current.agents.push(value.toLowerCase())
      }
    } else if (current && (key === 'allow' || key === 'disallow')) {
      current.rules.push({ type: key, path: value })
    }
  }
  const uaLower = ua.toLowerCase()
  // pick the most specific group: exact UA match > '*'
  const match = groups.find((g) => g.agents.some((a) => uaLower.includes(a) || a.includes(uaLower)))
  const wildcard = groups.find((g) => g.agents.includes('*'))
  const rules = (match || wildcard || { rules: [] }).rules
  return (urlPath) => {
    let allowed = true
    let bestLen = -1
    for (const r of rules) {
      if (!r.path) continue
      if (urlPath.startsWith(r.path) && r.path.length > bestLen) {
        bestLen = r.path.length
        allowed = r.type === 'allow'
      }
    }
    return allowed
  }
}

async function loadRobotsForHost(host, fetcher = get) {
  const url = `https://${host}/robots.txt`
  try {
    const res = await fetcher(url)
    if (res.statusCode !== 200) {
      res.resume?.()
      return compileRobots('')
    }
    let body = ''
    res.setEncoding('utf8')
    for await (const chunk of res) body += chunk
    return compileRobots(body)
  } catch {
    return compileRobots('')
  }
}

// Strip Shopify CDN size variants like _2048x2048 from URLs to request the
// original. Cap with ?width=1600 to avoid pulling absurdly large originals.
function normalizeImageUrl(srcUrl) {
  const u = new URL(srcUrl)
  // remove ?v=... query unless it's the only query — keep it; Shopify ignores
  u.pathname = u.pathname.replace(/_(\d{2,4})x(\d{2,4})(?=\.[a-z0-9]+$)/i, '')
  if (u.hostname.includes('cdn.shopify.com')) {
    if (!u.searchParams.has('width')) u.searchParams.set('width', '1600')
  }
  return u.toString()
}

function extFromUrl(srcUrl) {
  const u = new URL(srcUrl)
  const m = u.pathname.match(/\.([a-z0-9]+)$/i)
  return m ? m[1].toLowerCase() : 'jpg'
}

function readSidecar(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath + '.source', 'utf8'))
  } catch {
    return null
  }
}

function writeSidecar(filePath, sidecar) {
  fs.writeFileSync(filePath + '.source', JSON.stringify(sidecar, null, 2))
}

function existingPrimary(dir) {
  const files = fs.readdirSync(dir)
  return files.find((f) => /^switch-image\./i.test(f))
}

const MAX_BYTES = 10 * 1024 * 1024

async function downloadOne(targetPath, srcUrl, options = {}) {
  const { rateLimiter, fetcher = get, sidecar } = options
  const url = new URL(srcUrl)
  if (rateLimiter) await rateLimiter.wait(url.hostname)
  const res = await fetcher(srcUrl)
  if (res.statusCode !== 200) {
    res.resume?.()
    throw new Error(`HTTP ${res.statusCode} for ${srcUrl}`)
  }
  const ct = (res.headers['content-type'] || '').toLowerCase()
  if (!ct.startsWith('image/')) {
    res.resume?.()
    throw new Error(`non-image content-type "${ct}" for ${srcUrl}`)
  }
  const len = parseInt(res.headers['content-length'] || '0', 10)
  if (len && len > MAX_BYTES) {
    res.resume?.()
    throw new Error(`image too large (${len} bytes) for ${srcUrl}`)
  }
  const tmp = targetPath + '.partial'
  await new Promise((resolve, reject) => {
    const ws = fs.createWriteStream(tmp)
    let written = 0
    res.on('data', (chunk) => {
      written += chunk.length
      if (written > MAX_BYTES) {
        ws.destroy()
        res.destroy(new Error('exceeds MAX_BYTES'))
      }
    })
    res.pipe(ws)
    ws.on('finish', resolve)
    ws.on('error', reject)
    res.on('error', reject)
  })
  fs.renameSync(tmp, targetPath)
  if (sidecar) writeSidecar(targetPath, sidecar)
  return { bytes: fs.statSync(targetPath).size }
}

/**
 * Plan a download for a single match → returns { action, targetPath, url, reason }.
 * action ∈ 'download' | 'skip-existing-source' | 'skip-manual' | 'skip-no-images'
 */
function planDownload(match) {
  const product = match.product
  if (!product.images || product.images.length === 0) {
    return { action: 'skip-no-images' }
  }
  const primary = product.images[0]
  const ext = extFromUrl(primary.src)
  const targetPath = path.join(match.dirPath, `switch-image.${ext}`)
  const url = normalizeImageUrl(primary.src)

  const existing = existingPrimary(match.dirPath)
  if (existing) {
    const existingPath = path.join(match.dirPath, existing)
    const sidecar = readSidecar(existingPath)
    if (!sidecar) {
      return { action: 'skip-manual', existingPath, url }
    }
    if (sidecar.url === url) {
      return { action: 'skip-existing-source', existingPath, url }
    }
    if ((sidecar.priority || 0) >= (product.sourcePriority || 0)) {
      return { action: 'skip-existing-source', existingPath, url, reason: 'lower-or-equal-priority' }
    }
    // overwrite: same name reused if same ext, otherwise remove old
    if (existing !== `switch-image.${ext}`) {
      return { action: 'download', targetPath, url, removeOld: existingPath }
    }
    return { action: 'download', targetPath, url, removeOld: null }
  }
  return { action: 'download', targetPath, url, removeOld: null }
}

async function downloadMatched(matches, options = {}) {
  const limiter = options.rateLimiter || new RateLimiter(options.intervalMs || 1100)
  const robotsByHost = new Map()
  const stats = { downloaded: 0, skipped: 0, errors: 0, results: [] }

  for (const m of matches) {
    const plan = planDownload(m)
    if (plan.action !== 'download') {
      stats.skipped++
      stats.results.push({ ...plan, switchDir: m.dirPath })
      continue
    }
    const url = new URL(plan.url)
    if (!robotsByHost.has(url.hostname)) {
      robotsByHost.set(
        url.hostname,
        await loadRobotsForHost(url.hostname, options.fetcher),
      )
    }
    const allowed = robotsByHost.get(url.hostname)(url.pathname)
    if (!allowed) {
      stats.skipped++
      stats.results.push({ action: 'skip-robots', switchDir: m.dirPath, url: plan.url })
      continue
    }
    try {
      if (plan.removeOld) {
        try { fs.unlinkSync(plan.removeOld) } catch {}
        try { fs.unlinkSync(plan.removeOld + '.source') } catch {}
      }
      await downloadOne(plan.targetPath, plan.url, {
        rateLimiter: limiter,
        fetcher: options.fetcher,
        sidecar: {
          source: m.product.source,
          priority: m.product.sourcePriority,
          url: plan.url,
          sourceUrl: m.product.sourceUrl,
          fetched: new Date().toISOString().slice(0, 10),
        },
      })
      stats.downloaded++
      stats.results.push({ action: 'downloaded', switchDir: m.dirPath, url: plan.url, targetPath: plan.targetPath })
    } catch (e) {
      stats.errors++
      stats.results.push({ action: 'error', switchDir: m.dirPath, url: plan.url, error: e.message })
    }
  }
  return stats
}

module.exports = {
  RateLimiter,
  compileRobots,
  loadRobotsForHost,
  normalizeImageUrl,
  extFromUrl,
  planDownload,
  downloadMatched,
  readSidecar,
  writeSidecar,
}
