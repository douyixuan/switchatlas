# Decisions made — Switch Image Crawler

**Feature ID**: 003
**Shipped**: 2026-04-19
**Time budget**: Medium Batch (2–3 sessions)
**Actual effort**: 1 build session (with mid-session scope expansion)

## Key architectural decisions

- **Source-adapter pattern + Shopify factory**: every external storefront is
  a tiny module emitting a uniform `ProductRecord`. New Shopify sources
  cost ~5 lines. See ADR 0001.
- **`.source` sidecar as ownership marker + priority record**: lets the
  crawler safely cohabit with manual curation (no sidecar = hands off)
  and resolve cross-source conflicts deterministically. See ADR 0001.
- **Strict normalize-and-equal matcher (no fuzzy)**: false positives are
  permanent and visible; false negatives are logged and fixable.
  See ADR 0002.
- **Outputs land in the existing `data/vendors` filesystem**; attribution
  goes into `README.md` frontmatter. Zero changes to `lib/data.ts` or
  `copy-images.js`. See ADR 0003.
- **Sitemap + JSON-LD scrape fallback** for non-Shopify sites
  (milktooth/Next.js). More robust than `__NEXT_DATA__`. See ADR 0004.
- **Per-host token-bucket rate limiter (1.1s) + robots.txt longest-match
  parser** + identifying User-Agent. See ADR 0004.

## What was cut (scope hammering)

- **R0 reduced from "≥50% coverage" to "≥15%"** before the build started,
  once probing showed Shopify catalogs alone couldn't sustain 50%.
  Final delivered: 12.8% (slight miss) — the gap is source-breadth, not
  pipeline quality.
- **`--multi-image` flag**: parsed but unused. Single-image v1 keeps
  switch directories tidy; carousel will be re-shaped when the gallery
  UI is revisited.
- **switchesdb.com / ThereminGoat as image sources**: framing assumed
  these had photos; probing showed they don't (frontend-only repo,
  PDF/CSV-only data). Cut at shape time.
- **UI rendering of attribution**: `sources.images` is written to
  frontmatter but no UI consumes it yet. Deliberately deferred — the
  data is durable and a future "Photo credit" widget is independent
  work.

## What surprised us

- **milktooth Next.js scrape**: the framing/shape assumed
  `__NEXT_DATA__`; reality was Next.js 15 RSC with no such blob. JSON-LD
  Product schema (Schema.org) turned out to be a more stable, easier
  fallback than the original plan. Worth remembering for any future
  non-Shopify source.
- **Initial 1/118 match rate**: the shaped noise-token list (`5pin`,
  `pcs`) was insufficient — needed switch-type words too (`linear`,
  `tactile`, `clicky`, `silent`, `hall`, `effect`, `he`, `magnetic`).
  Lesson: noise tokens should be derived from real titles, not
  imagined ones. Future shapes for matchers should always prototype
  against a real titles fixture before committing to a strategy.
- **Mid-session scope expansion paid off cheaply**: adding milktooth
  *and then* the three additional Shopify sources (kbdfans, divinikey,
  novelkeys) each cost a small amount of code thanks to the factory
  pattern that emerged organically. The factory was not in the shape
  — it was a refactor at the very end of the session. ADR 0001
  captures this so the pattern can be reused intentionally next time.
- **Coverage saturation**: hitting 5 sources moved coverage from 6.6% →
  13.0%. Adding a 6th retail source would likely add <1pp. The shape's
  intuition that "more retail Shopify sources = closes the gap" was
  partially wrong; the long tail is on community forums and Reddit,
  not retailers.

## Future improvement areas

- **Long-tail coverage** (push past ~15%): would need a new shape
  exploring image aggregators, Reddit `r/MechanicalKeyboards`, or AI
  visual search. Not a code-quality issue — a sourcing one.
- **Multi-image gallery support**: re-shape together with the
  detail-page gallery UI work; the `--multi-image` flag is already in
  the CLI surface.
- **UI rendering of `sources.images` attribution**: small follow-up
  feature. Two-line change in detail-content component.
- **Force-refresh flag**: useful when a source rotates its CDN URLs
  and we want to re-download everything. Simple to add (ignore
  `sidecar.url == new` check).
- **Manual alias map**: `matcher.js` already has a `VENDOR_ALIASES`
  constant (currently empty). A small JSON file of switch-name aliases
  could push match rate by ~5pp without weakening strictness.
