/**
 * scripts/crawl_images/sources/kbdfans.js
 *
 * Shopify storefront. ~36 products in /collections/switches.
 */
const { createShopifySource } = require('./shopify')

module.exports = createShopifySource({
  name: 'kbdfans',
  priority: 11,
  base: 'https://kbdfans.com',
  collection: '/collections/switches/products.json',
})
