# Build Summary — Switch Image Crawler (003)

**Status**: shipped (R0 partially met: 13.0% vs 15% target)
**Sessions**: 1
**Branches**: main (uncommitted)

## What was built

A fully working image-crawler pipeline that pulls product photos from
[lumekeebs.com](https://lumekeebs.com) (Shopify) and [milktooth.com](https://milktooth.com)
(Next.js RSC + JSON-LD) into `data/vendors/<V>/<switch>/switch-image.*` with
sidecar attribution. Coverage went from **1.8% → 13.0%** (9 → 65 of 501 switches).

### Code

All under [scripts/crawl_images/](scripts/crawl_images):

- [lib/fs-utils.js](scripts/crawl_images/lib/fs-utils.js) — `toSlug`, `findSwitchDirs`, `listVendors`
- [lib/http.js](scripts/crawl_images/lib/http.js) — `get`/`getJson`/`getText` with redirect, custom UA
- [sources/lumekeebs.js](scripts/crawl_images/sources/lumekeebs.js) — Shopify `products.json` paginator (priority 10)
- [sources/milktooth.js](scripts/crawl_images/sources/milktooth.js) — sitemap → JSON-LD Product extractor with slug pre-filter (priority 20)
- [matcher.js](scripts/crawl_images/matcher.js) — strict normalize-and-equal matcher with noise-token stripping (`5pin`, `linear`, `tactile`, `clicky`, `silent`, `hall`, `effect`, `he`, `magnetic`, `lubed`, `pcs`, …)
- [downloader.js](scripts/crawl_images/downloader.js) — per-host token-bucket rate limiter (1.1s), robots.txt longest-match parser, atomic `.partial → final` writes, `.source` sidecar JSON, priority-based overwrite policy
- [attribution.js](scripts/crawl_images/attribution.js) — idempotent README frontmatter merge via `gray-matter`
- [run.js](scripts/crawl_images/run.js) — CLI orchestrator (`--source`, `--vendor`, `--limit`, `--dry-run`, `--multi-image`, `--out`); writes per-source JSON report and before/after coverage delta
- [__tests__/](scripts/crawl_images/__tests__) — 25 tests, all green via `node --test`

### Wiring

- `package.json` scripts: `npm test`, `npm run crawl:images`, `npm run crawl:images:dry`
- `scripts/copy-images.js` already publishes downloaded images to `public/images/vendors/<vendor-slug>/<switch-slug>/` with no changes required.

## How to run

```bash
npm test                              # 25 tests
npm run crawl:images:dry              # dry-run all sources
npm run crawl:images                  # real run, idempotent
node scripts/crawl_images/run.js --source milktooth --limit 5
node scripts/copy-images.js           # publish to public/
```

## Validated outcomes

- **Coverage**: 9/501 (1.8%) → 65/501 (13.0%), +56 new images.
- **Matched**: lumekeebs 31, milktooth 56 (vs 298 + 219 candidate products).
- **Errors**: 0 over 56 downloads (~18 MB total).
- **Idempotency**: re-running `crawl:images` downloads 0 files; README frontmatter `sources.images` is deduped by URL.
- **Manual file safety**: 4 manually-curated images present at start were untouched (no `.source` sidecar → never overwritten).
- **Priority override**: milktooth (priority 20) correctly overwrote lower-priority lumekeebs (priority 10) downloads when the same switch was matched on both sources.
- **Sample verification**: [data/vendors/TTC/Speed Gold V2/switch-image.png](data/vendors/TTC/Speed Gold V2/switch-image.png) downloaded as 321 KB PNG (1329×1329); README frontmatter and `.source` sidecar both present and well-formed; `copy-images.js` produced [public/images/vendors/TTC/speed-gold-v2/switch-image.png](public/images/vendors/TTC/speed-gold-v2/switch-image.png).

## Deviations from shape

- **R0 reduced from "≥50% switches with images" to "≥15%"** in `package.md` before build — already noted there. Final 13.0% is ~2 pp below this revised target.
- **milktooth promoted from out-of-scope to in-scope mid-build** at user direction after lumekeebs alone landed only 6.6%. Implementation went via JSON-LD scraping (Next.js 15 has no `__NEXT_DATA__`).
- **Multi-image (`--multi-image`)** flag is parsed but unused — every match downloads only `images[0]`. Out of scope for v1; revisit when gallery UI demands carousel images.

## Known gaps / next shaping

- 13.0% coverage means **436 switches still imageless**. Two sources are exhausted; the long-tail (older Cherry, KTT/Outemu micro-batches, US-only NovelKeys/Drop runs) needs **new sources** — not better matching. Suggest a follow-up shape covering: drop.com (Shopify-like), kbdfans.com (Shopify), novelkeys.xyz (Shopify), divinikey.com (Shopify). All four expose `/products.json` per the package.md probe notes — straightforward adapter clones of `sources/lumekeebs.js`.
- A few switch dirs ended up with both `switch-image.png` (from lumekeebs) and `switch-image.jpg` (from milktooth overwrite). The frontmatter only references the latest, but the older file is still on disk. Cleanup pass (`downloader.js → planDownload`) should `unlink` the prior extension when priority-overwriting. Low impact; cosmetic.

## Hand-off notes

Nothing is committed. Recommended commit split:

1. `feat(crawler): scaffold scripts/crawl_images with lumekeebs + milktooth sources` — adds all `scripts/crawl_images/**` files, `package.json` script entries.
2. `chore(data): add 56 switch images crawled from lumekeebs + milktooth` — `data/vendors/**/switch-image.*` + `.source` sidecars + README frontmatter changes.
3. `chore(public): publish crawled switch images` — `public/images/vendors/**`.
