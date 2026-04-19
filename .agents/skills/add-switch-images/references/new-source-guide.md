# Writing a New Source Adapter

Read this when the existing 5 crawler sources have hit their coverage ceiling
and you need to add a new retail site as an image source.

## Table of Contents

1. [Probe the site](#probe-the-site)
2. [Shopify adapter (5 lines)](#shopify-adapter)
3. [JSON-LD / sitemap adapter](#json-ld-adapter)
4. [The ProductRecord contract](#the-productrecord-contract)
5. [Register in run.js](#register-in-runjs)
6. [Priority allocation](#priority-allocation)
7. [Test the new source](#test-the-new-source)

---

## Probe the site

Before writing any code, check what structured data the site exposes:

```bash
# Shopify detection — if this returns JSON with a "products" array, you're golden
curl -s "https://example.com/collections/switches/products.json?page=1&limit=1" | head -c 500

# Sitemap discovery — look for product URLs
curl -s "https://example.com/sitemap.xml" | head -50

# JSON-LD on a product page — look for application/ld+json script tags
curl -s "https://example.com/products/some-switch" | grep -o 'application/ld+json' | head -1
```

**Decision tree:**
- Shopify JSON endpoint works → Use `createShopifySource()` factory (easiest)
- Has sitemap + JSON-LD Product blocks → Write a sitemap scraper (like milktooth)
- Neither → Probably not worth the effort; add images manually instead

---

## Shopify adapter

Most keyboard switch retailers run on Shopify. The factory handles pagination,
normalization, and the `ProductRecord` contract automatically.

```javascript
// scripts/crawl_images/sources/newstore.js
const { createShopifySource } = require('./shopify')

module.exports = createShopifySource({
  name: 'newstore',       // used in reports, attribution, CLI --source flag
  priority: 14,           // see priority allocation below
  base: 'https://newstore.com',
  collection: '/collections/switches/products.json',
})
```

That's it. The factory (`sources/shopify.js`) handles:
- Paginating through `?page=N&limit=250` until empty
- Normalizing each product into a `ProductRecord`
- Extracting vendor, title, handle, images with positions

---

## JSON-LD adapter

For sites that don't expose Shopify-style JSON (e.g. Next.js, custom platforms),
you can scrape JSON-LD Product schema from individual pages.

Reference implementation: `sources/milktooth.js`

The pattern:
1. Fetch the sitemap to get product URLs
2. (Optional) Pre-filter URLs using candidate slugs from `data/vendors/`
3. For each product page, extract `<script type="application/ld+json">`
4. Parse the JSON-LD, find `@type: "Product"` blocks
5. Extract vendor from `brand.name`, title from `name`, image from `image`
6. Return a `ProductRecord`

```javascript
// Skeleton — adapt to the specific site's structure
const { getText } = require('../lib/http')

const NAME = 'newstore'
const PRIORITY = 21

async function fetchCatalog({ rateLimiter, candidateSlugs, slugNormalizer, onProgress } = {}) {
  // 1. Get product URLs from sitemap
  const res = await getText('https://example.com/sitemap-products.xml')
  const urls = extractLocs(res.text)

  // 2. Optional: pre-filter to only fetch pages we might match
  let candidates = urls
  if (candidateSlugs && slugNormalizer) {
    candidates = urls.filter(u => {
      const slug = slugFromUrl(u)
      return slug && candidateSlugs.has(slugNormalizer(slug.replace(/-/g, ' ')))
    })
  }

  // 3. Fetch each page, extract JSON-LD Product
  const records = []
  for (const url of candidates) {
    if (rateLimiter) await rateLimiter.wait(new URL(url).hostname)
    const page = await getText(url)
    const record = pageToRecord(url, page.text)
    if (record) records.push(record)
  }
  return records
}

module.exports = { NAME, PRIORITY, fetchCatalog }
```

The important bits:
- Accept `rateLimiter` and use it — the orchestrator passes one in
- Accept `candidateSlugs` for pre-filtering — avoids fetching hundreds of
  irrelevant pages
- Return the standard `ProductRecord` shape (see below)

---

## The ProductRecord contract

Every source adapter must return an array of objects matching this shape:

```javascript
{
  source: 'newstore',        // adapter name — used in .source sidecar and attribution
  sourcePriority: 14,        // integer — higher wins in overwrite conflicts
  vendor: 'Akko',            // must match a data/vendors/ directory name (or be aliased)
  title: 'CS Jelly Pink',    // product name — the matcher will normalize this
  handle: 'akko-cs-jelly-pink', // URL slug from the source
  sourceUrl: 'https://...',  // link to the product page (for attribution)
  images: [                  // array sorted by position; images[0] is used for download
    { src: 'https://cdn...', position: 1 }
  ]
}
```

The `vendor` field is critical — if it doesn't match our directory names,
the matcher will skip the product. Check what vendor names the source uses
and add aliases to `VENDOR_ALIASES` in `matcher.js` if needed.

---

## Register in run.js

After writing the adapter, register it in the orchestrator:

```javascript
// scripts/crawl_images/run.js — add import
const { fetchCatalog: fetchNewstore } = require('./sources/newstore')

// ... then add to SOURCES object:
const SOURCES = {
  lumekeebs: { fetchCatalog: fetchLumekeebs, priority: 10 },
  kbdfans: { fetchCatalog: fetchKbdfans, priority: 11 },
  divinikey: { fetchCatalog: fetchDivinikey, priority: 12 },
  novelkeys: { fetchCatalog: fetchNovelkeys, priority: 13 },
  milktooth: { fetchCatalog: fetchMilktooth, priority: 20 },
  newstore: { fetchCatalog: fetchNewstore, priority: 14 },  // ← add
}
```

---

## Priority allocation

Priority is an integer. Higher number = higher quality = wins overwrite
conflicts against lower numbers.

| Range | Category | Current assignments |
|-------|----------|-------------------|
| 10–19 | Shopify retailers | lumekeebs=10, kbdfans=11, divinikey=12, novelkeys=13 |
| 20–29 | Curated / photo-focused | milktooth=20 |
| 30+ | Reserved for community / aggregator sources | (none yet) |
| ∞ | Manual placement (no `.source` file) | implicit — never overwritten |

When assigning a priority to a new source, consider photo quality. Retailers
with clean, professional switch photos should get higher priority than those
with cluttered marketplace-style images.

---

## Test the new source

Always dry-run first — never download without reviewing match quality:

```bash
# 1. Dry run — fetch catalog + match, don't download
node scripts/crawl_images/run.js --dry-run --source newstore

# 2. Check match quality
cat scripts/crawl_images/reports/newstore/matched.log | wc -l    # how many matched?
cat scripts/crawl_images/reports/newstore/unmatched.log | wc -l   # how many missed?
cat scripts/crawl_images/reports/newstore/unmatched.log | head -5 # why did they miss?

# 3. Small download test
node scripts/crawl_images/run.js --source newstore --limit 3

# 4. Verify the downloaded images exist and look correct
find data/vendors -name "*.source" -newer scripts/crawl_images/run.js | head -5
```
