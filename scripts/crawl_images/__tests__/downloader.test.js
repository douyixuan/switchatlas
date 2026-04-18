const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')
const { Readable } = require('node:stream')

const {
  RateLimiter,
  compileRobots,
  normalizeImageUrl,
  extFromUrl,
  planDownload,
  downloadMatched,
  readSidecar,
} = require('../downloader')
const { writeAttribution } = require('../attribution')

function fakeImageResponse(bytes = 'PNGDATA') {
  const buf = Buffer.from(bytes)
  const stream = Readable.from([buf])
  stream.statusCode = 200
  stream.headers = { 'content-type': 'image/png', 'content-length': String(buf.length) }
  stream.setEncoding = () => {}
  return stream
}

function makeSwitchDir(extra = {}) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-dl-'))
  fs.writeFileSync(
    path.join(tmp, 'README.md'),
    '---\nname: Test\nvendor: Test\n---\n\nbody\n',
  )
  if (extra.manualImage) {
    fs.writeFileSync(path.join(tmp, 'switch-image.jpg'), 'OLD')
  }
  if (extra.crawlerImage) {
    fs.writeFileSync(path.join(tmp, 'switch-image.png'), 'OLD')
    fs.writeFileSync(
      path.join(tmp, 'switch-image.png.source'),
      JSON.stringify({ source: 'lumekeebs', priority: 10, url: extra.crawlerImage }),
    )
  }
  return tmp
}

test('normalizeImageUrl strips shopify size variants', () => {
  assert.equal(
    normalizeImageUrl('https://cdn.shopify.com/x/y/img_2048x2048.png?v=1'),
    'https://cdn.shopify.com/x/y/img.png?v=1&width=1600',
  )
  assert.equal(
    normalizeImageUrl('https://other.example/img.jpg'),
    'https://other.example/img.jpg',
  )
})

test('extFromUrl returns lowercase extension', () => {
  assert.equal(extFromUrl('https://x/y/foo.PNG?v=1'), 'png')
  assert.equal(extFromUrl('https://x/y/bar.jpeg'), 'jpeg')
  assert.equal(extFromUrl('https://x/y/no-ext'), 'jpg')
})

test('compileRobots respects Disallow rules and longest-match Allow', () => {
  const txt = `User-agent: *\nDisallow: /admin\nAllow: /admin/public\n`
  const fn = compileRobots(txt)
  assert.equal(fn('/admin/secret'), false)
  assert.equal(fn('/admin/public/img.png'), true)
  assert.equal(fn('/products/x'), true)
})

test('RateLimiter waits at least intervalMs between calls per host', async () => {
  const rl = new RateLimiter(50)
  const t0 = Date.now()
  await rl.wait('a')
  await rl.wait('a')
  await rl.wait('a')
  const elapsed = Date.now() - t0
  assert.ok(elapsed >= 90, `expected ≥90ms, got ${elapsed}`)
})

test('planDownload skips manually placed images (no sidecar)', () => {
  const dir = makeSwitchDir({ manualImage: true })
  try {
    const plan = planDownload({
      dirPath: dir,
      product: {
        source: 'lumekeebs',
        sourcePriority: 10,
        images: [{ src: 'https://cdn.shopify.com/x/img.png', position: 1 }],
      },
    })
    assert.equal(plan.action, 'skip-manual')
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test('planDownload re-downloads when sidecar URL differs and priority allows', () => {
  const dir = makeSwitchDir({ crawlerImage: 'https://old/url.png' })
  try {
    const plan = planDownload({
      dirPath: dir,
      product: {
        source: 'milktooth',
        sourcePriority: 20, // higher
        images: [{ src: 'https://cdn.shopify.com/x/new.png', position: 1 }],
      },
    })
    assert.equal(plan.action, 'download')
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test('planDownload skips when sidecar URL matches incoming URL', () => {
  const dir = makeSwitchDir({ crawlerImage: 'https://cdn.shopify.com/x/same.png?width=1600' })
  try {
    const plan = planDownload({
      dirPath: dir,
      product: {
        source: 'lumekeebs',
        sourcePriority: 10,
        images: [{ src: 'https://cdn.shopify.com/x/same.png', position: 1 }],
      },
    })
    assert.equal(plan.action, 'skip-existing-source')
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test('downloadMatched writes file + sidecar and respects robots disallow', async () => {
  const dir = makeSwitchDir()
  try {
    const fakeFetcher = async (url) => {
      const u = new URL(url)
      if (u.pathname === '/robots.txt') {
        const r = Readable.from([Buffer.from('User-agent: *\nDisallow: /\n')])
        r.statusCode = 200
        r.headers = { 'content-type': 'text/plain' }
        r.setEncoding = () => {}
        return r
      }
      return fakeImageResponse()
    }
    const stats = await downloadMatched(
      [
        {
          dirPath: dir,
          product: {
            source: 'lumekeebs',
            sourcePriority: 10,
            sourceUrl: 'https://example.com/products/test',
            images: [{ src: 'https://example.com/x.png', position: 1 }],
          },
        },
      ],
      { fetcher: fakeFetcher, intervalMs: 1 },
    )
    assert.equal(stats.downloaded, 0)
    assert.equal(stats.skipped, 1)
    assert.equal(stats.results[0].action, 'skip-robots')
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test('downloadMatched downloads when robots allow', async () => {
  const dir = makeSwitchDir()
  try {
    const fakeFetcher = async (url) => {
      const u = new URL(url)
      if (u.pathname === '/robots.txt') {
        const r = Readable.from([Buffer.from('User-agent: *\nAllow: /\n')])
        r.statusCode = 200
        r.headers = { 'content-type': 'text/plain' }
        r.setEncoding = () => {}
        return r
      }
      return fakeImageResponse('PNGDATA')
    }
    const stats = await downloadMatched(
      [
        {
          dirPath: dir,
          product: {
            source: 'lumekeebs',
            sourcePriority: 10,
            sourceUrl: 'https://example.com/products/test',
            images: [{ src: 'https://example.com/x.png', position: 1 }],
          },
        },
      ],
      { fetcher: fakeFetcher, intervalMs: 1 },
    )
    assert.equal(stats.downloaded, 1)
    const written = fs.readFileSync(path.join(dir, 'switch-image.png'), 'utf8')
    assert.equal(written, 'PNGDATA')
    const sidecar = readSidecar(path.join(dir, 'switch-image.png'))
    assert.equal(sidecar.source, 'lumekeebs')
    assert.equal(sidecar.priority, 10)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test('writeAttribution adds entry to frontmatter and is idempotent', () => {
  const dir = makeSwitchDir()
  try {
    const entry = {
      file: 'switch-image.png',
      site: 'lumekeebs',
      url: 'https://example.com/x.png?width=1600',
      sourceUrl: 'https://example.com/products/test',
      fetched: '2026-04-18',
    }
    writeAttribution(dir, entry)
    writeAttribution(dir, entry) // second call must not duplicate
    const raw = fs.readFileSync(path.join(dir, 'README.md'), 'utf8')
    const parsed = require('gray-matter')(raw)
    assert.equal(parsed.data.sources.images.length, 1)
    assert.equal(parsed.data.sources.images[0].site, 'lumekeebs')
    // body content preserved
    assert.match(parsed.content, /body/)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})
