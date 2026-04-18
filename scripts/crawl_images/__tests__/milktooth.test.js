const test = require('node:test')
const assert = require('node:assert/strict')
const {
  parseJsonLdProduct,
  pageToRecord,
  slugFromUrl,
  extractLocs,
  fetchCatalog,
} = require('../sources/milktooth')

const SAMPLE_PAGE = `<!DOCTYPE html><html><head>
<title>Test · Milktooth</title>
<script type="application/ld+json">{"@context":"https://schema.org","@type":"Organization","name":"Milktooth"}</script>
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"Product","name":"Gateron Oil King (V2) Linear Switch","image":"http://res.cloudinary.com/milktooth/image/upload/v1/oil_king.jpg","brand":{"@type":"Brand","name":"Gateron"},"url":"https://milktooth.com/products/oil-king"}
</script>
</head><body>x</body></html>`

const SAMPLE_SITEMAP = `<?xml version="1.0"?><urlset>
<url><loc>https://milktooth.com/products/oil-king</loc></url>
<url><loc>https://milktooth.com/products/silent-ink-black</loc></url>
<url><loc>https://milktooth.com/products/random-other</loc></url>
</urlset>`

test('extractLocs returns sitemap URLs', () => {
  assert.deepEqual(extractLocs(SAMPLE_SITEMAP), [
    'https://milktooth.com/products/oil-king',
    'https://milktooth.com/products/silent-ink-black',
    'https://milktooth.com/products/random-other',
  ])
})

test('slugFromUrl extracts the product handle', () => {
  assert.equal(
    slugFromUrl('https://milktooth.com/products/oil-king'),
    'oil-king',
  )
  assert.equal(slugFromUrl('https://milktooth.com/about'), null)
})

test('parseJsonLdProduct picks the Product block (skips Organization)', () => {
  const ld = parseJsonLdProduct(SAMPLE_PAGE)
  assert.equal(ld['@type'], 'Product')
  assert.equal(ld.name, 'Gateron Oil King (V2) Linear Switch')
})

test('pageToRecord upgrades cloudinary http to https and shapes ProductRecord', () => {
  const rec = pageToRecord('https://milktooth.com/products/oil-king', SAMPLE_PAGE)
  assert.equal(rec.source, 'milktooth')
  assert.equal(rec.vendor, 'Gateron')
  assert.equal(rec.title, 'Gateron Oil King (V2) Linear Switch')
  assert.equal(rec.handle, 'oil-king')
  assert.equal(rec.images.length, 1)
  assert.match(rec.images[0].src, /^https:\/\/res\.cloudinary\.com/)
})

test('fetchCatalog applies candidateSlugs pre-filter', async () => {
  const fetched = []
  const fakeFetcher = async (url) => {
    fetched.push(url)
    if (url.endsWith('server-sitemap-products.xml')) {
      return { status: 200, text: SAMPLE_SITEMAP }
    }
    return { status: 200, text: SAMPLE_PAGE }
  }
  const candidateSlugs = new Set(['oil-king'])
  const records = await fetchCatalog({
    fetcher: fakeFetcher,
    candidateSlugs,
    slugNormalizer: (s) => s.toLowerCase().replace(/\s+/g, '-'),
  })
  // sitemap + only one product page (oil-king)
  assert.equal(fetched.length, 2)
  assert.equal(records.length, 1)
  assert.equal(records[0].handle, 'oil-king')
})
