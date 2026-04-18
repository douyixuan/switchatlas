# ADR 0001: Source-adapter pattern with priority-based overwrite via `.source` sidecars

**Status**: Accepted
**Date**: 2026-04-19
**Feature**: 003 — switch-image-crawler

## Context

Feature 003 needed to populate switch product photos from multiple external
storefronts (lumekeebs, milktooth, kbdfans, divinikey, novelkeys). Each
storefront has a different shape (Shopify JSON vs. Next.js JSON-LD scrape),
yet downstream code (matcher, downloader, attribution writer) needs a single
record format. We also needed a way to:

- let a higher-quality source overwrite a lower-quality one when both have
  the same switch (R5 — priority override), and
- never touch images placed by humans (R5 — manual files are sacred), and
- skip re-downloading a file that already came from the same URL (R7 —
  incremental).

## Decision

**Source adapters** are tiny modules under `scripts/crawl_images/sources/`
that all expose `fetchCatalog()` and emit a uniform `ProductRecord`:

```js
{ source, sourcePriority, vendor, title, handle, sourceUrl, images: [{src, position}] }
```

A `createShopifySource({name, priority, base, collection})` factory in
`sources/shopify.js` covers every Shopify storefront in 5 lines per source.
Non-Shopify sites (milktooth) get a hand-written adapter that emits the
same shape.

**Priority** is a per-source integer (lumekeebs=10, kbdfans=11, divinikey=12,
novelkeys=13, milktooth=20). Higher number wins.

**Crawler ownership is marked by a `.source` sidecar** — every downloaded
`switch-image.<ext>` is accompanied by `switch-image.<ext>.source` containing
JSON `{source, priority, url, sourceUrl, fetched}`. The downloader's policy:

| existing file | sidecar present? | action |
|---|---|---|
| no | n/a | download |
| yes | no (manual) | **skip** — never overwrite human curation |
| yes | yes, sidecar.url == new url | skip — already have this one |
| yes | yes, sidecar.priority >= new | skip — same/lower-priority source |
| yes | yes, sidecar.priority < new | **overwrite** (and unlink old + old `.source` if extension changed) |

## Rationale

The sidecar does double duty: it's the priority record *and* the
ownership marker. Any file lacking a sidecar is by definition not ours,
which means manual curation requires zero coordination — drop a file in
the switch directory and the crawler will leave it alone forever.

The factory + uniform record shape made adding three additional Shopify
sources in scope expansion a 15-minute job (just a config object each).

## Alternatives considered

- **Single hard-coded multi-source script**: rejected — every new storefront
  would touch the runner, the matcher, and the downloader. Doesn't scale to
  the 4–6 storefronts we expect to add over time.
- **Database / index file tracking ownership**: rejected — would create a
  second source of truth that can drift from the actual filesystem state.
  The sidecar lives next to the file it describes; deleting the image
  deletes the sidecar context.
- **Filename-encoded ownership** (e.g. `switch-image.lumekeebs.png`):
  rejected — would change the public file convention used by
  `lib/data.ts` and `scripts/copy-images.js`.

## Consequences

**Positive**:
- New sources cost ~5 lines for Shopify, one short adapter for non-Shopify.
- Manual curation needs no opt-out flag — absence of sidecar = "hands off".
- Re-running the crawler is a near-instant no-op when nothing has changed.

**Negative / trade-offs**:
- Two files per image (image + sidecar) — visible in `ls` and PR diffs.
- A bug in priority arithmetic could overwrite a human's file if they
  ever happened to leave a sidecar by mistake. Mitigated by sidecars being
  authored only by the downloader.

**Future considerations**:
- If we ever need to re-fetch *all* images regardless of cache (e.g. CDN
  rotation), we'll need a `--force` flag that ignores `sidecar.url == new`.
- If a source goes offline, sidecars referencing its URL won't auto-fall
  back to a still-online source. A "demote stale sources" pass could be
  added when this becomes a real problem.
