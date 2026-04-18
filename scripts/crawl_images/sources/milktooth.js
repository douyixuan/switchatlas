/**
 * scripts/crawl_images/sources/milktooth.js
 *
 * Milktooth.com is a Next.js (RSC) site, so the Shopify `/products.json`
 * endpoint returns 404. We instead use the public XML sitemap to discover
 * product URLs, then extract JSON-LD `Product` schema from each page (which
 * gives us name, brand and a primary image URL on `cdn.cloudinary.com`).
 *
 * To avoid pounding 800+ pages every run, the source supports a slug
 * pre-filter: callers can pass `candidateSlugs` (built from `data/vendors`
 * directory names normalized through the matcher's `normalizeDirNameForMatch`)
 * and we only fetch product pages whose URL slug normalizes to one of those
 * candidates. This keeps a typical run under ~100 page fetches.
 */
const { get, getText } = require('../lib/http')

const NAME = 'milktooth'
const PRIORITY = 20 // higher than lumekeebs — milktooth photos tend to be cleaner

const SITEMAP_INDEX = 'https://milktooth.com/sitemap.xml'
const PRODUCTS_SITEMAP = 'https://milktooth.com/server-sitemap-products.xml'

function extractLocs(xml) {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
}

function slugFromUrl(url) {
  const u = new URL(url)
  const m = u.pathname.match(/\/products\/([^/?#]+)/)
  return m ? m[1] : null
}

async function fetchProductSitemap({ fetcher = getText } = {}) {
  const res = await fetcher(PRODUCTS_SITEMAP)
  if (res.status !== 200) throw new Error(`milktooth sitemap HTTP ${res.status}`)
  return extractLocs(res.text)
}

function parseJsonLdProduct(html) {
  // there can be multiple <script type="application/ld+json"> blocks; we want
  // the one with @type === 'Product'.
  const blocks = [
    ...html.matchAll(
      /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/g,
    ),
  ]
  for (const b of blocks) {
    try {
      const j = JSON.parse(b[1])
      const candidates = Array.isArray(j) ? j : [j]
      for (const c of candidates) {
        if (c && c['@type'] === 'Product') return c
      }
    } catch {
      // ignore non-JSON
    }
  }
  return null
}

function pageToRecord(url, html) {
  const ld = parseJsonLdProduct(html)
  if (!ld) return null
  const vendor = ld.brand?.name || ld.brand || ''
  const title = ld.name || ''
  const imageRaw = Array.isArray(ld.image) ? ld.image[0] : ld.image
  if (!imageRaw) return null
  // cloudinary http → https
  const imageSrc = imageRaw.replace(/^http:\/\//, 'https://')
  return {
    source: NAME,
    sourcePriority: PRIORITY,
    vendor: String(vendor).trim(),
    title: String(title).trim(),
    handle: slugFromUrl(url),
    sourceUrl: url,
    images: [{ src: imageSrc, position: 1 }],
  }
}

async function fetchCatalog({
  fetcher = getText,
  rateLimiter = null,
  candidateSlugs = null, // optional Set<string> of normalized dir slugs
  slugNormalizer = null, // (string) => string, must match matcher's pipeline
  maxPages = Infinity,
  onProgress = null,
} = {}) {
  const urls = await fetchProductSitemap({ fetcher })
  let candidates = urls
  if (candidateSlugs && slugNormalizer) {
    candidates = urls.filter((u) => {
      const slug = slugFromUrl(u)
      if (!slug) return false
      const normalized = slugNormalizer(slug.replace(/-/g, ' '))
      if (candidateSlugs.has(normalized)) return true
      // also accept when a dir slug is a whole-token suffix/substring of the
      // product slug — milktooth often vendor-prefixes the slug, e.g.
      // `akko-cs-jelly-pink` for the `CS Jelly Pink` switch. We compare on
      // a hyphenated form to ensure word-boundary safety.
      const hyphenated = `-${normalized.replace(/\s+/g, '-')}-`
      for (const cand of candidateSlugs) {
        if (!cand) continue
        const candHy = `-${cand.replace(/\s+/g, '-')}-`
        if (hyphenated.includes(candHy)) return true
      }
      return false
    })
  }
  const records = []
  let count = 0
  for (const url of candidates) {
    if (count >= maxPages) break
    if (rateLimiter) await rateLimiter.wait('milktooth.com')
    let res
    try {
      res = await fetcher(url)
    } catch {
      continue
    }
    if (res.status !== 200) continue
    const rec = pageToRecord(url, res.text)
    if (rec) records.push(rec)
    count++
    if (onProgress) onProgress({ fetched: count, total: candidates.length, found: records.length })
  }
  return records
}

module.exports = {
  NAME,
  PRIORITY,
  fetchCatalog,
  parseJsonLdProduct,
  pageToRecord,
  slugFromUrl,
  extractLocs,
}
