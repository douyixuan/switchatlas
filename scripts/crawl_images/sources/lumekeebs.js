const { getJson } = require('../lib/http')

const NAME = 'lumekeebs'
const PRIORITY = 10
const BASE = 'https://lumekeebs.com'
const COLLECTION = '/collections/switches/products.json'
const PAGE_LIMIT = 250

function normalizeRecord(p) {
  return {
    source: NAME,
    sourcePriority: PRIORITY,
    vendor: (p.vendor || '').trim(),
    title: (p.title || '').trim(),
    handle: p.handle,
    sourceUrl: `${BASE}/products/${p.handle}`,
    images: (p.images || [])
      .map((img) => ({ src: img.src, position: img.position }))
      .sort((a, b) => a.position - b.position),
  }
}

async function fetchCatalog({ maxPages = 20, fetcher = getJson } = {}) {
  const all = []
  for (let page = 1; page <= maxPages; page++) {
    const url = `${BASE}${COLLECTION}?page=${page}&limit=${PAGE_LIMIT}`
    const data = await fetcher(url)
    const products = data.products || []
    if (products.length === 0) break
    for (const p of products) all.push(normalizeRecord(p))
    if (products.length < PAGE_LIMIT) break
  }
  return all
}

function parseProducts(jsonObject) {
  return (jsonObject.products || []).map(normalizeRecord)
}

module.exports = { fetchCatalog, parseProducts, NAME, PRIORITY }
