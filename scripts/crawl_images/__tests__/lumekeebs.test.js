const test = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
const fs = require('node:fs')
const { parseProducts, fetchCatalog } = require('../sources/lumekeebs')

const FIXTURE = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, '..', 'fixtures', 'lumekeebs-sample.json'),
    'utf8',
  ),
)

test('parseProducts normalizes shopify products into ProductRecord shape', () => {
  const records = parseProducts(FIXTURE)
  assert.equal(records.length, FIXTURE.products.length)
  for (const r of records) {
    assert.equal(r.source, 'lumekeebs')
    assert.equal(typeof r.vendor, 'string')
    assert.equal(typeof r.title, 'string')
    assert.equal(typeof r.handle, 'string')
    assert.match(r.sourceUrl, /^https:\/\/lumekeebs\.com\/products\//)
    assert.ok(Array.isArray(r.images))
    if (r.images.length > 0) {
      assert.equal(typeof r.images[0].src, 'string')
      assert.equal(typeof r.images[0].position, 'number')
      // sorted by position ascending
      for (let i = 1; i < r.images.length; i++) {
        assert.ok(r.images[i].position >= r.images[i - 1].position)
      }
    }
  }
})

test('fetchCatalog stops after first short page', async () => {
  let calls = 0
  const fakeFetcher = async () => {
    calls++
    return FIXTURE // 5 products < PAGE_LIMIT
  }
  const records = await fetchCatalog({ fetcher: fakeFetcher })
  assert.equal(calls, 1)
  assert.equal(records.length, FIXTURE.products.length)
})

test('fetchCatalog stops on empty page', async () => {
  let calls = 0
  const fakeFetcher = async () => {
    calls++
    if (calls === 1) {
      // return a full page so paginator continues
      const fakeProducts = []
      for (let i = 0; i < 250; i++) {
        fakeProducts.push({ ...FIXTURE.products[0], id: i, handle: `h-${i}` })
      }
      return { products: fakeProducts }
    }
    return { products: [] }
  }
  const records = await fetchCatalog({ fetcher: fakeFetcher })
  assert.equal(calls, 2)
  assert.equal(records.length, 250)
})
