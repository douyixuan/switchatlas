# Architecture

This document grows by feature. Each section is appended on ship — never
overwritten. Read top-to-bottom for chronological evolution.

---

## Switch Image Crawler (2026-04-19, feature 003)

### Patterns introduced

- **Source adapter + factory**: every external data source is a small
  module under `scripts/crawl_images/sources/` exposing
  `fetchCatalog()` and emitting a uniform `ProductRecord`. A
  `createShopifySource()` factory in `sources/shopify.js` covers any
  Shopify storefront in a 5-line config. Non-Shopify adapters are
  hand-written but share the same output contract. See
  [ADR 0001](decisions/0001-source-adapters-and-sidecar-overwrite-policy.md).
- **`.source` sidecar as ownership marker**: every crawler-written file
  has a sibling `<file>.source` JSON. Files without sidecars are by
  definition human-curated and never overwritten. The sidecar also
  carries the source's priority, used for cross-source overwrites.
- **Strict normalize-and-equal matching with noise-token stripping**:
  no fuzzy matching anywhere. Match-or-log-and-skip is preferred over
  any guesswork — false positives (wrong photo) are visible and
  embarrassing; false negatives (missing photo) are recoverable.
  See [ADR 0002](decisions/0002-strict-matcher-no-fuzzy.md).
- **Sitemap + JSON-LD scrape**: fallback technique for sites that
  don't expose a Shopify-style products.json. Works for any site that
  publishes Schema.org Product blocks (most modern e-commerce).
  See [ADR 0004](decisions/0004-rate-limit-robots-and-jsonld-fallback.md).
- **Per-host token-bucket rate limiter**: shared across catalog fetches
  and image downloads for the same host; default 1.1s.

### Data model changes

- **`README.md` frontmatter — new optional field `sources.images`**:
  array of `{file, site, url, sourceUrl}` entries documenting where
  each downloaded image came from. Additive only — `lib/data.ts` is
  unchanged. See
  [ADR 0003](decisions/0003-data-vendors-filesystem-and-readme-attribution.md).
- **`switch-image.<ext>.source` sidecar files**: new JSON files in
  `data/vendors/<V>/<Switch>/` carrying `{source, priority, url,
  sourceUrl, fetched}`. Co-located with the image they describe.

### Conventions established

- **External data sources go under `scripts/crawl_images/sources/`** as
  one file per source, exporting `{NAME, PRIORITY, fetchCatalog}`.
  New Shopify sources should call `createShopifySource()` — don't
  duplicate the paginator.
- **Source priority is a small integer**, higher wins. Current
  allocation: 10–19 reserved for Shopify-style retailers; 20+ for
  curated/photo-focused sources (e.g. milktooth).
- **Crawler output lives in the same data tree as manual files**.
  Don't create parallel manifests, indexes, or databases. The
  filesystem + frontmatter + sidecar is the contract.
- **Tests use Node's built-in `node --test` runner**. No new test
  framework dep. Run via `npm test`.
- **Crawler scripts are gitignored when they emit per-run data**:
  `scripts/crawl_images/reports/` is ignored.

### CLI surface

- `npm run crawl:images` — full run, all sources.
- `npm run crawl:images:dry` — dry-run; reports only.
- `node scripts/crawl_images/run.js --source NAME --vendor V --limit N`.

### Known limitations

- **Coverage ceiling ~13% from retail sources**: lumekeebs, milktooth,
  kbdfans, divinikey, novelkeys collectively stop providing useful
  matches around 13% of our 500 switches. The remaining long-tail
  (older Cherry MX, KTT/Outemu micro-batches) needs different
  sources entirely (image aggregators, community forums) and was
  deferred. Re-shape if/when this matters.
- **Single-image only in v1**: the `--multi-image` flag is parsed but
  unused. Each match downloads only `images[0]`. Re-shape when the
  detail-page UI demands a carousel.
- **Pre-filter blinds milktooth to net-new switches**: by design, the
  milktooth adapter only fetches product pages whose slug already
  matches an existing `data/vendors` directory. So it can fill
  photo gaps but never add a new switch — that's an explicit
  filesystem-first choice.

---

## Hide Imageless Switches (2026-04-19, feature 004)

### Patterns introduced

- **Data-layer default filter with opt-out**: `getSwitchesByVendor()`
  defaults to returning only switches with real images. Callers that
  need the full dataset (e.g. `generateStaticParams`) pass
  `{ includeImageless: true }`. This "safe default" pattern means new
  consumers automatically get correct behavior without remembering to
  filter. See
  [ADR 0005](decisions/0005-default-filter-imageless-switches.md).
- **`hasRealImage(sw)` predicate**: uses `.endsWith('/images/default-switch.svg')`
  rather than equality, covering both empty and non-empty `BASE_PATH`
  deployments. Exported for reuse.

### Data model changes

- None. Purely a query-layer change — `Switch` type and `parseSwitchDir`
  output are unchanged.

### Conventions established

- **New switch list consumers should call `getSwitchesByVendor()` without
  `includeImageless`** — they get filtered results by default. Only
  override when you explicitly need all switches (e.g. static
  generation, search indexing).
- **Use `getVendorsWithImages()` for navigation/display** — this filters
  out vendors with zero visible switches. `getAllVendors()` is for
  exhaustive enumeration only (e.g. `generateStaticParams`).
- **Empty-state guard in list components**: `VendorContent` renders a
  localized message when `switches.length === 0`. Future list
  components should follow this pattern.

### Known limitations

- **No coverage signal UI**: the listing doesn't tell users "64 of 499
  switches shown" — the ratio isn't surfaced anywhere. Deferred as
  independent Small Batch (R4 from frame).
- **No "show all" toggle**: users cannot manually reveal imageless
  switches in list views. Direct URLs still work.
- **Navigation hides 3 vendors entirely** (JWK, NovelKeys, Zeal):
  these vendors have zero switches with images. They remain accessible
  via direct URL but are invisible in sidebar and homepage.
