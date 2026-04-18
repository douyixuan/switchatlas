/**
 * scripts/crawl_images/sources/shopify.js
 *
 * Generic Shopify storefront source factory. Most keyboard-switch retailers
 * run on Shopify and expose a public `/collections/<slug>/products.json`
 * endpoint that returns paginated product JSON with `vendor`, `title`,
 * `handle`, and `images[]` ready to use.
 *
 * Usage:
 *   const lumekeebs = createShopifySource({
 *     name: 'lumekeebs',
 *     priority: 10,
 *     base: 'https://lumekeebs.com',
 *     collection: '/collections/switches/products.json',
 *   })
 */
const { getJson } = require('../lib/http')

const PAGE_LIMIT = 250

function makeNormalizer({ name, priority, base }) {
  return function normalizeRecord(p) {
    return {
      source: name,
      sourcePriority: priority,
      vendor: (p.vendor || '').trim(),
      title: (p.title || '').trim(),
      handle: p.handle,
      sourceUrl: `${base}/products/${p.handle}`,
      images: (p.images || [])
        .map((img) => ({ src: img.src, position: img.position }))
        .sort((a, b) => a.position - b.position),
    }
  }
}

function createShopifySource({ name, priority, base, collection }) {
  const normalizeRecord = makeNormalizer({ name, priority, base })

  async function fetchCatalog({ maxPages = 20, fetcher = getJson } = {}) {
    const all = []
    for (let page = 1; page <= maxPages; page++) {
      const url = `${base}${collection}?page=${page}&limit=${PAGE_LIMIT}`
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

  return { NAME: name, PRIORITY: priority, fetchCatalog, parseProducts }
}

module.exports = { createShopifySource, PAGE_LIMIT }
