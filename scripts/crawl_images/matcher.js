const path = require('node:path')
const fs = require('node:fs')
const { toSlug, findSwitchDirs, listVendors } = require('./lib/fs-utils')

// Tokens stripped from titles before slugging — they are packaging/variant
// noise, never part of the canonical switch name.
const NOISE_TOKENS = [
  // packaging / pin variants
  '5pin',
  '3pin',
  'pcs',
  'pc',
  'pack',
  'switches',
  'switch',
  'sample',
  'samples',
  'tester',
  // lube / edition fluff
  'lubed',
  'unlubed',
  'prelubed',
  'pre-lubed',
  'factory',
  'edition',
  'limited',
  'set',
  'kit',
  // switch-type words (titles include them, dir names typically omit)
  'linear',
  'tactile',
  'clicky',
  'silent',
  // hall-effect labels
  'hall',
  'effect',
  'he',
  'magnetic',
]

// vendor aliases — left side is the lumekeebs vendor field we want to fold
// into our `data/vendors/` top-level directory name on the right.
const VENDOR_ALIASES = {
  // none yet — extend as discovered
}

function normalizeVendor(v) {
  const key = (v || '').trim()
  return VENDOR_ALIASES[key] || key
}

function stripNoise(s) {
  let out = s
  // strip parenthetical / bracketed groups
  out = out.replace(/\([^)]*\)/g, ' ').replace(/\[[^\]]*\]/g, ' ')
  // strip pack-count tokens like "10PCS", "x10", "10x", "(10)"
  out = out.replace(/\b\d+\s*(?:pcs|pc|x|pack)\b/gi, ' ')
  out = out.replace(/\bx\s*\d+\b/gi, ' ')
  // collapse "5-pin" / "3-pin" with optional dash/space
  out = out.replace(/\b[35]\s*-?\s*pin\b/gi, ' ')
  // word-level token strip
  const words = out.split(/[\s\-_/]+/).filter(Boolean)
  const filtered = words.filter((w) => !NOISE_TOKENS.includes(w.toLowerCase()))
  return filtered.join(' ')
}

function normalizeTitleForMatch(vendor, title) {
  let t = title
  // strip leading vendor name from title to mirror dir paths which omit vendor
  const v = (vendor || '').trim()
  if (v) {
    const re = new RegExp('^\\s*' + v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    t = t.replace(re, '')
  }
  t = stripNoise(t)
  return toSlug(t)
}

function normalizeDirNameForMatch(relativePath) {
  // dir paths under data/vendors/<V>/ — apply same noise stripping
  return toSlug(stripNoise(relativePath))
}

/**
 * Build an index from a vendor's switch dirs to their normalized slugs.
 * Returns Map<normalizedSlug, dirPath[]>.
 */
function indexVendorDirs(vendorDir) {
  const dirs = findSwitchDirs(vendorDir)
  const index = new Map()
  for (const dir of dirs) {
    const rel = path.relative(vendorDir, dir)
    const norm = normalizeDirNameForMatch(rel)
    if (!index.has(norm)) index.set(norm, [])
    index.get(norm).push(dir)
  }
  return index
}

/**
 * @param {ProductRecord[]} records
 * @param {{ dataDir: string, vendorWhitelist?: string[] }} opts
 */
function matchProducts(records, { dataDir, vendorWhitelist } = {}) {
  const vendors = vendorWhitelist || listVendors(dataDir)
  const vendorSet = new Set(vendors.map((v) => v.toLowerCase()))

  // build per-vendor index lazily
  const indexByVendor = new Map()
  function getIndex(vendor) {
    if (!indexByVendor.has(vendor)) {
      indexByVendor.set(vendor, indexVendorDirs(path.join(dataDir, vendor)))
    }
    return indexByVendor.get(vendor)
  }

  const matched = []
  const unmatched = []
  const ambiguous = []
  const skippedVendor = []

  for (const r of records) {
    const v = normalizeVendor(r.vendor)
    if (!v || !vendorSet.has(v.toLowerCase())) {
      skippedVendor.push({
        vendor: r.vendor,
        title: r.title,
        sourceUrl: r.sourceUrl,
      })
      continue
    }
    // resolve canonical vendor casing from whitelist
    const canonicalVendor = vendors.find(
      (x) => x.toLowerCase() === v.toLowerCase(),
    )
    const idx = getIndex(canonicalVendor)
    const norm = normalizeTitleForMatch(canonicalVendor, r.title)
    const hits = idx.get(norm) || []
    if (hits.length === 1) {
      matched.push({
        dirPath: hits[0],
        vendor: canonicalVendor,
        normalizedSlug: norm,
        product: r,
      })
    } else if (hits.length === 0) {
      unmatched.push({
        vendor: canonicalVendor,
        title: r.title,
        normalized: norm,
        sourceUrl: r.sourceUrl,
      })
    } else {
      ambiguous.push({
        vendor: canonicalVendor,
        title: r.title,
        normalized: norm,
        candidates: hits,
        sourceUrl: r.sourceUrl,
      })
    }
  }

  return { matched, unmatched, ambiguous, skippedVendor }
}

function writeMatchLogs(outDir, result) {
  fs.mkdirSync(outDir, { recursive: true })
  const fmt = (rows) =>
    rows
      .map((r) =>
        JSON.stringify({
          vendor: r.vendor,
          title: r.title,
          normalized: r.normalized,
          sourceUrl: r.sourceUrl,
          ...(r.candidates ? { candidates: r.candidates } : {}),
        }),
      )
      .join('\n') + '\n'
  fs.writeFileSync(path.join(outDir, 'unmatched.log'), fmt(result.unmatched))
  fs.writeFileSync(path.join(outDir, 'ambiguous.log'), fmt(result.ambiguous))
  fs.writeFileSync(
    path.join(outDir, 'skipped-vendor.log'),
    result.skippedVendor
      .map((r) => JSON.stringify(r))
      .join('\n') + '\n',
  )
}

module.exports = {
  matchProducts,
  writeMatchLogs,
  normalizeTitleForMatch,
  normalizeDirNameForMatch,
  stripNoise,
  NOISE_TOKENS,
  VENDOR_ALIASES,
}
