/**
 * scripts/crawl_images/sources/novelkeys.js
 *
 * Shopify storefront. ~24 products in /collections/switches.
 */
const { createShopifySource } = require('./shopify')

module.exports = createShopifySource({
  name: 'novelkeys',
  priority: 13,
  base: 'https://novelkeys.com',
  collection: '/collections/switches/products.json',
})
