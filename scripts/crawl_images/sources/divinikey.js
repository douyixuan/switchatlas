/**
 * scripts/crawl_images/sources/divinikey.js
 *
 * Shopify storefront. ~110 products in /collections/switches.
 */
const { createShopifySource } = require('./shopify')

module.exports = createShopifySource({
  name: 'divinikey',
  priority: 12,
  base: 'https://divinikey.com',
  collection: '/collections/switches/products.json',
})
