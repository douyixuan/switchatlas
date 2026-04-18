# ADR 0003: Crawler outputs land directly in `data/vendors/` filesystem; README frontmatter holds attribution

**Status**: Accepted
**Date**: 2026-04-19
**Feature**: 003 — switch-image-crawler

## Context

SwitchAtlas already uses `data/vendors/<Vendor>/<Switch>/` as a
filesystem-backed "database": each switch folder has a `README.md`
(YAML frontmatter for specs), a `force-curve.csv`, and optionally
`switch-image.*`. The runtime loader (`lib/data.ts`) reads this tree
and `scripts/copy-images.js` mirrors images into `public/images/...`
for the static site build.

The crawler needed to decide *where* its outputs go and *how*
attribution metadata is recorded.

## Decision

The crawler writes **directly into the existing filesystem convention**:

- The downloaded image lands at `data/vendors/<V>/<Switch>/switch-image.<ext>`
  — same path a human would use, picked up by `lib/data.ts` and
  `scripts/copy-images.js` with **zero changes** to either.
- A sibling `switch-image.<ext>.source` JSON file marks crawler ownership
  (see ADR 0001).
- Per-image attribution is **merged into the switch's `README.md`
  frontmatter** under `sources.images`:

  ```yaml
  sources:
    images:
      - file: switch-image.png
        site: lumekeebs
        url: https://cdn.shopify.com/...
        sourceUrl: https://lumekeebs.com/products/...
  ```

Writes are done with `gray-matter` (already a runtime dep), idempotent
by URL.

## Rationale

The data tree is already the source of truth. Adding a parallel
crawler index, manifest file, or DB would create a second store that
can drift. Letting the crawler use the same conventions as a human
contributor makes manual edits and crawler edits indistinguishable
to downstream code.

`sources.images` is a new frontmatter field but it's *additive* —
`lib/data.ts` only reads `images`, `force`, `travel`, `source_csv`,
so the addition is transparent today. A future feature can render the
attribution block in the UI ("Photo credit: lumekeebs") without any
crawler changes.

## Alternatives considered

- **Separate `attributions.json` manifest at repo root**: rejected —
  would need its own loader, would double the diff surface on every
  crawl (one image change touches two files), and would split
  ownership across the repo.
- **Embed attribution in image EXIF**: rejected — many target images
  are PNG/WebP without standardized EXIF, requires a binary library,
  and is invisible in PR diffs.
- **Database (SQLite) of crawl history**: rejected — introduces a
  binary artifact, unsuitable for git diff review, and out of step with
  the rest of the project's "filesystem is the DB" philosophy.

## Consequences

**Positive**:
- Zero changes to `lib/data.ts` or `scripts/copy-images.js`.
- `git diff` on a crawler run is human-readable: image binary + tiny
  YAML hunk per switch.
- Manual contributors and the crawler use the same data shape.

**Negative / trade-offs**:
- Each crawl run can touch many `README.md` files, producing large but
  shallow PRs. Acceptable because each diff is mechanical and
  predictable (URL-keyed dedupe means re-runs produce no diff).
- `sources.images` is YAML-noisy when many sources contribute. Bounded
  in practice by current source count.

**Future considerations**:
- When the gallery UI (feature 002 area) is revisited, rendering
  `sources.images` becomes a small follow-up.
- If a switch ever accumulates >5 attribution entries, a one-line cap
  may be desirable to keep frontmatter readable.
