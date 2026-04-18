# ADR 0004: Per-host token-bucket rate limiting + sitemap+JSON-LD fallback for non-Shopify sites

**Status**: Accepted
**Date**: 2026-04-19
**Feature**: 003 — switch-image-crawler

## Context

The crawler hits third-party storefronts. Two operational concerns drove
this decision:

1. **Politeness / abuse prevention** (R3): we need robots.txt compliance,
   rate-limiting, and an identifying User-Agent — both because it's the
   right thing to do and because aggressive scraping risks getting our
   IPs blocked from sites our users go to anyway.
2. **Non-Shopify sites**: milktooth.com runs Next.js 15 (RSC) and exposes
   no `/products.json` and no `__NEXT_DATA__`, but it has 800+ products
   we want. We discovered mid-build that the framing's assumption that
   it could be scraped via `__NEXT_DATA__` was wrong.

## Decision

**Rate limiting**: a per-host `RateLimiter` token bucket
(`scripts/crawl_images/downloader.js`) with a 1.1s default interval.
The same limiter instance is shared across the catalog fetch and the
image downloads for one host, so a milktooth crawl that hits 200 product
pages + 50 image downloads does ≈ 250 × 1.1s = ~5 minutes of network
time, never bursting.

**robots.txt**: each host's `/robots.txt` is fetched once per run,
parsed with a longest-match Allow/Disallow algorithm
(`compileRobots`), and consulted before every download. The User-Agent
is `SwitchAtlasCrawler/1.0 (+https://github.com/switchatlas/switchatlas)`.

**Non-Shopify fallback (milktooth)**: when a Shopify products.json is
not available, the adapter:
1. fetches the public XML sitemap (`server-sitemap-products.xml` for
   milktooth — exposes 821 product URLs),
2. **pre-filters** product URLs against a candidate-slug set built from
   our existing `data/vendors` directory names (so a typical run only
   fetches ~200 pages instead of all 821),
3. fetches each candidate page through the rate limiter,
4. extracts the JSON-LD `<script type="application/ld+json">` block
   that has `"@type": "Product"` (the Schema.org Product schema is
   stable across Next.js builds in a way `__NEXT_DATA__` is not), and
5. normalizes to the same `ProductRecord` shape as the Shopify
   adapters.

## Rationale

A token bucket is simpler than a leaky bucket and matches the natural
"one request, then wait" pattern. Per-host scoping avoids accidentally
serializing parallel crawls of two unrelated sites.

JSON-LD turned out to be a much better fallback than `__NEXT_DATA__`:
the Schema.org contract is web-wide, doesn't change with framework
upgrades, and is also indexed by Google so storefronts have an
incentive to keep it correct.

The candidate-slug pre-filter was the difference between a 5-minute
crawl and a 15-minute one, *and* it cuts request load to milktooth by
~75% — a politeness win on top of a speed win.

## Alternatives considered

- **No rate limit, just retry on 429**: rejected — reactive. Polite
  scraping should not require the host to push back.
- **Distributed rate limiter across processes**: out of scope —
  there's only ever one crawler process.
- **Headless browser (Playwright) for milktooth**: rejected — heavy
  dependency, slow startup, opaque to debug. JSON-LD via plain HTTPS
  was sufficient.
- **Crawl all 821 milktooth pages and match after**: rejected — 4×
  the bandwidth and a politeness liability. Pre-filter is cheap and
  loses nothing because we couldn't have matched the filtered-out URLs
  anyway.
- **RSC stream parsing**: tried briefly, rejected — the
  `?_rsc=1` payload is a custom React serialization format with
  references and embedded module IDs; brittle to parse and changes
  between Next.js versions.

## Consequences

**Positive**:
- Zero observed rate-limit / 4xx errors across all 5 sources.
- Adding a non-Shopify source no longer requires reverse-engineering
  framework internals — just check for a JSON-LD block.
- robots.txt compliance is automatic and audit-able from the report.

**Negative / trade-offs**:
- 1.1s per request makes a full milktooth crawl take minutes. Acceptable
  because crawls run nightly / on-demand, not in a request path.
- The candidate-slug pre-filter means we **never discover** new switches
  on milktooth that aren't already in our `data/vendors` tree — milktooth
  can only fill gaps, not seed new switches. Acceptable for v1.

**Future considerations**:
- If we add many more Next.js / non-Shopify sources, factor the
  sitemap + JSON-LD pattern into a `createSitemapJsonLdSource()` mirror
  of `createShopifySource()`.
- If a host's robots.txt ever disallows `/products/*`, the source
  silently emits nothing — worth surfacing as a loud warning in the
  report rather than a quiet zero.
