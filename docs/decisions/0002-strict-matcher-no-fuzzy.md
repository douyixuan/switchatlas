# ADR 0002: Strict normalize-and-equal matcher with noise-token stripping (no fuzzy matching)

**Status**: Accepted
**Date**: 2026-04-19
**Feature**: 003 — switch-image-crawler

## Context

The crawler needs to map a vendor's product title (e.g. `"Gateron Oil King
(V2) Linear Switch"`) to one of our 500-ish switch directories
(e.g. `data/vendors/Gateron/Oil King V2/`). Naive equality fails on noise
tokens like pin counts (`5-Pin`), pack sizes (`10PCS`), and switch-type
words (`Linear`, `Tactile`, `Silent`, `HE`, `Magnetic`) that vendors put
in titles but our directory names omit. Edit-distance / fuzzy matching
would be the obvious fix, but it has known false-positive rates that are
unacceptable given image attribution is permanent and visible.

## Decision

The matcher is **strictly normalize-and-equal**: after normalization, the
two strings must be identical or it's a no-match. There is no edit
distance, no token-set ratio, no fuzzy threshold.

Normalization (`stripNoise` in `scripts/crawl_images/matcher.js`):

1. lowercase
2. strip parens/brackets and their contents (`(V2)`, `[Pre-Lubed]`)
3. strip pack-count tokens (`10PCS`, `x10`, `90 pieces`)
4. strip pin-count tokens (`5-pin`, `3 pin`)
5. strip a fixed `NOISE_TOKENS` set:
   `5pin / 3pin / pcs / pc / pack / switches / switch / sample / samples /
   tester / lubed / unlubed / prelubed / pre-lubed / factory / edition /
   limited / set / kit / linear / tactile / clicky / silent / hall /
   effect / he / magnetic`
6. collapse whitespace + punctuation to single hyphens

`normalizeTitleForMatch(vendor, title)` additionally strips a leading
vendor prefix (so `"Gateron Oil King"` → `"Oil King"` for vendor
`"Gateron"`).

A no-match writes to `unmatched.log`; multiple matches write to
`ambiguous.log` (defensive — should not happen under strict equality).
Both are NDJSON for grep / human review.

## Rationale

The unmatched / ambiguous logs are a safety net: when a switch genuinely
should match but doesn't (typo, missing alias), the log surfaces it
within seconds and the fix is one entry in `NOISE_TOKENS` or a new
manual alias. False negatives are recoverable; false positives (wrong
photo on a switch page) are visible to every visitor and embarrassing.

Validated outcome: across lumekeebs (298 SKUs) + milktooth (219 SKUs
after sitemap pre-filter), 87 strict matches with **zero observed
false positives** in spot checks.

## Alternatives considered

- **Fuzzy matching (Levenshtein / token-set ratio)**: rejected — at any
  threshold loose enough to handle real-world title variation, it would
  also confuse `Box V2 Brown` with `Box V2 Red`, `Cream Yellow Pro`
  with `Cream Yellow`, and similarly-named family members. The cost of
  one wrong photo is much higher than the cost of one missing photo.
- **Hand-curated alias map**: rejected as the *only* mechanism — would
  require an alias for every product. Acceptable as a future supplement
  to handle the long tail (the matcher already exposes
  `VENDOR_ALIASES`, currently empty).
- **LLM-assisted matching**: rejected — non-deterministic, opaque,
  expensive to re-run, and still requires human review for the same
  false-positive concern.

## Consequences

**Positive**:
- Deterministic, reproducible, diff-able.
- Zero external dependencies, runs in milliseconds.
- New noise tokens can be added in one place and re-run instantly.

**Negative / trade-offs**:
- Match rate is bounded by how well our directory names align with vendor
  titles. ~26% on the two largest sources is the current ceiling.
- `NOISE_TOKENS` is a tuning surface — adding the wrong word (e.g.
  `red`) would silently merge unrelated switches. Code review of
  changes to that constant matters.

**Future considerations**:
- If a future source uses a wholly different naming convention (e.g.
  Chinese vendor names romanized differently), per-source
  normalization hooks may be needed.
- If we want to push matching beyond ~30%, the next leverage is the
  alias map, not fuzzier matching.
