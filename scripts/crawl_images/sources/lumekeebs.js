/**
 * scripts/crawl_images/sources/lumekeebs.js
 *
 * Shopify storefront. ~298 products in /collections/switches.
 */
const { createShopifySource } = require('./shopify')

module.exports = createShopifySource({
  name: 'lumekeebs',
  priority: 10,
  base: 'https://lumekeebs.com',
  collection: '/collections/switches/products.json',
})
