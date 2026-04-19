# Crawler Internals

Deep reference for the SwitchAtlas image crawler pipeline. Read this when
you need to debug matching issues, understand the overwrite policy, or
troubleshoot downloads.

## Table of Contents

1. [Pipeline overview](#pipeline-overview)
2. [The matcher](#the-matcher)
3. [Debugging unmatched switches](#debugging-unmatched-switches)
4. [Overwrite policy](#overwrite-policy)
5. [Vendor aliases and noise tokens](#vendor-aliases-and-noise-tokens)
6. [Attribution](#attribution)
7. [Crawler ethics](#crawler-ethics)

---

## Pipeline overview

```
Source adapter         Matcher              Downloader          Attribution
(fetch catalog)  →  (normalize+match)  →  (rate-limited GET)  →  (README frontmatter)
     │                    │                     │                      │
 ProductRecord[]    MatchedRecord[]      switch-image.<ext>      sources.images[]
                    + unmatched.log      + .source sidecar
                    + ambiguous.log
```

All code lives under `scripts/crawl_images/`. The orchestrator is `run.js`.

---

## The matcher

File: `scripts/crawl_images/matcher.js`

The matcher is **strictly normalize-and-equal** — after normalization, two
strings must be identical or it's a no-match. There is no fuzzy matching,
no edit distance, no threshold. This is intentional: a wrong photo on a
switch page is visible and embarrassing; a missing photo is just a gap
to fill later.

### Normalization flow

```
ProductRecord { vendor: "Akko", title: "Akko CS Jelly Pink Linear Switch 5-Pin 10PCS" }

1. normalizeVendor("Akko") → "Akko"
   └─ checks VENDOR_ALIASES, falls back to input

2. Find "Akko" in data/vendors/ → ✓

3. normalizeTitleForMatch("Akko", "Akko CS Jelly Pink Linear Switch 5-Pin 10PCS")
   ├─ strip vendor prefix → "CS Jelly Pink Linear Switch 5-Pin 10PCS"
   ├─ stripNoise() removes: "Linear", "Switch", "5-Pin", "10PCS"
   ├─ remaining → "CS Jelly Pink"
   └─ toSlug() → "cs-jelly-pink"

4. normalizeDirNameForMatch("CS Jelly Pink")
   └─ toSlug() → "cs-jelly-pink"

5. Strict equality: "cs-jelly-pink" === "cs-jelly-pink" → ✅ match
```

### What `stripNoise` removes

- Parenthetical groups: `(V2)`, `[Pre-Lubed]`
- Pack counts: `10PCS`, `x10`, `90 pieces`
- Pin counts: `5-pin`, `3 pin`
- Fixed noise tokens (all lowercased): `switches`, `switch`, `linear`,
  `tactile`, `clicky`, `silent`, `lubed`, `unlubed`, `prelubed`, `pcs`,
  `pc`, `pack`, `sample`, `tester`, `factory`, `edition`, `limited`,
  `set`, `kit`, `hall`, `effect`, `he`, `magnetic`

---

## Debugging unmatched switches

When the crawler can't match a product to a local switch directory, it
writes to `scripts/crawl_images/reports/<source>/unmatched.log` (NDJSON).

### Quick diagnosis

```bash
# See what didn't match
cat scripts/crawl_images/reports/lumekeebs/unmatched.log | jq '.title, .normalized'

# Compare normalization of a specific title vs directory name
node -e "
  const m = require('./scripts/crawl_images/matcher');
  console.log('title:', m.normalizeTitleForMatch('Cherry', 'Cherry MX Black Linear Switch'));
  console.log('dir:  ', m.normalizeDirNameForMatch('MX Black'));
"
```

### Common causes and fixes

| Symptom | Cause | Fix |
|---------|-------|-----|
| Vendor "DUROCK" not found | Case/spelling differs from directory | Add entry to `VENDOR_ALIASES` in `matcher.js` |
| Title normalizes differently than dir | Parenthetical content in dir name but stripped from title | Rename dir or adjust `stripNoise` |
| New packaging word in title | Missing from `NOISE_TOKENS` | Add word (lowercase) to the array |
| Product is a bundle, not a switch | Source lists kits/bundles too | Ignore — legitimate non-match |

---

## Overwrite policy

Every crawler-downloaded image gets a `.source` sidecar file
(`switch-image.png.source`) containing JSON:

```json
{
  "source": "lumekeebs",
  "priority": 10,
  "url": "https://cdn.shopify.com/...",
  "sourceUrl": "https://lumekeebs.com/products/...",
  "fetched": "2026-04-18"
}
```

The downloader uses this sidecar to decide whether to write:

| Existing file? | Has `.source`? | Action |
|----------------|---------------|--------|
| No | — | **Download** |
| Yes | No (manual placement) | **Skip** — never overwrite human curation |
| Yes | Yes, same URL | **Skip** — already have it |
| Yes | Yes, priority ≥ new source | **Skip** — keep higher-quality version |
| Yes | Yes, priority < new source | **Overwrite** with higher-priority source |

The key insight: **files without a `.source` sidecar are sacred.** They're
assumed to be placed by a human and will never be touched by the crawler.
This is why manual images should NOT have a `.source` file.

---

## Vendor aliases and noise tokens

### Adding a vendor alias

When a source's vendor field doesn't match our directory name exactly:

```javascript
// scripts/crawl_images/matcher.js
const VENDOR_ALIASES = {
  'DUROCK': 'Durock',
  'SP Star': 'SP-Star',
  // left = what the source says, right = our data/vendors/ directory name
}
```

### Adding a noise token

When product titles contain words that our directory names don't:

```javascript
// scripts/crawl_images/matcher.js — add to NOISE_TOKENS array (lowercase)
const NOISE_TOKENS = [
  // ... existing tokens ...
  'newword',
]
```

---

## Attribution

File: `scripts/crawl_images/attribution.js`

After downloading an image, the crawler updates the switch's `README.md`
frontmatter to record where the image came from:

```yaml
sources:
  images:
    - file: switch-image.png
      site: lumekeebs
      url: https://cdn.shopify.com/...?width=1600
      sourceUrl: https://lumekeebs.com/products/akko-botany-linear-switches
      fetched: '2026-04-18'
```

This is idempotent — rerunning with the same URL won't duplicate entries.
The attribution uses `gray-matter` (already a project dependency) to
parse and serialize frontmatter.

---

## Crawler ethics

The crawler has built-in safeguards that should not be bypassed:

1. **User-Agent**: `SwitchAtlasCrawler/1.0 (+https://github.com/...)` —
   identifies itself honestly
2. **robots.txt**: checked per host before downloading; disallowed paths
   are skipped
3. **Rate limiting**: per-host token bucket, minimum 1.1s between requests
   to the same host
4. **Content validation**: checks `Content-Type: image/*`, max 10MB
5. **Atomic writes**: downloads to `.partial` temp file, renames on success

If a site blocks the crawler, the right response is to switch to a different
source or add images manually — not to disguise the user-agent or remove
rate limiting.
