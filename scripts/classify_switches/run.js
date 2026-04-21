/**
 * scripts/classify_switches/run.js
 *
 * CLI runner for the metadata classification pipeline.
 *
 * Usage:
 *   node scripts/classify_switches/run.js [options]
 *
 * Options:
 *   --dry-run        (default) Classify + report without writing READMEs
 *   --apply          Write inferred type/sound back to README.md frontmatter
 *   --vendor <name>  Limit to a single vendor directory
 *   --review-only    Emit only the review CSV (conflicts + low-confidence items)
 *   --limit <n>      Process at most N switches (debug helper)
 *
 * Outputs (written to scripts/classify_switches/reports/):
 *   report-<ts>.json    Per-vendor counts and overall summary
 *   review-<ts>.csv     Items needing manual review (conflict or low confidence)
 */
'use strict'

const fs = require('node:fs')
const path = require('node:path')

const { inferTypeFromCurve } = require('./curve')
const { readFrontmatter, writeFrontmatterPatch } = require('./frontmatter')

// ── Constants ──────────────────────────────────────────────────────────────

const DATA_DIR = path.join(__dirname, '../../data/vendors')
const REPORTS_DIR = path.join(__dirname, 'reports')

const REVIEW_CONFIDENCE_THRESHOLD = 0.65 // items below this go to review CSV

// ── Keyword dictionaries ───────────────────────────────────────────────────

const CLICKY_KEYWORDS = [
  'clicky',
  'navy',
  'jade',
  'box white',
  'box green',
  'box pink',
  'blue switch',
  'green switch',
  'white switch',
]

const TACTILE_KEYWORDS = [
  'tactile',
  'brown',
  'ergo clear',
  'topre',
  'boba',
  'holy pandas',
  'holy panda',
  'u4',
]

const LINEAR_KEYWORDS = [
  'linear',
  'red',
  'black',
  'yellow',
  'speed silver',
  'silver',
]

const SILENT_KEYWORDS = ['silent', 'silence', 'muted', 'quiet']

// ── Exported functions (also used in tests) ────────────────────────────────

/**
 * Infer type from switch name and source URL using keyword matching.
 *
 * @param {string} name       Switch name
 * @param {string} sourceUrl  Source URL (may be empty)
 * @returns {{ type: 'Linear'|'Tactile'|'Clicky'|'Unknown', confidence: number }}
 */
function inferTypeFromKeywords(name, sourceUrl) {
  const haystack = `${name} ${sourceUrl}`.toLowerCase()

  // Check Clicky first (highest specificity)
  if (CLICKY_KEYWORDS.some((kw) => haystack.includes(kw))) {
    return { type: 'Clicky', confidence: 0.7 }
  }

  // Tactile
  if (TACTILE_KEYWORDS.some((kw) => haystack.includes(kw))) {
    return { type: 'Tactile', confidence: 0.6 }
  }

  // Linear (lowest priority — many generic color names are ambiguous)
  if (LINEAR_KEYWORDS.some((kw) => haystack.includes(kw))) {
    return { type: 'Linear', confidence: 0.5 }
  }

  return { type: 'Unknown', confidence: 0 }
}

/**
 * Infer the sound field value for a switch.
 * Only assigns 'Silent' when explicitly indicated.
 * Returns the existing value if set and no overriding signal.
 * Returns undefined if no conclusion can be drawn.
 *
 * @param {string}           name          Switch name
 * @param {string}           sourceUrl     Source URL
 * @param {string|undefined} existingSound Current sound value from frontmatter
 * @returns {string|undefined}
 */
function inferSound(name, sourceUrl, existingSound) {
  const haystack = `${name} ${sourceUrl}`.toLowerCase()
  if (SILENT_KEYWORDS.some((kw) => haystack.includes(kw))) {
    return 'Silent'
  }
  return existingSound // could be a string or undefined
}

/**
 * Fuse curve-based and keyword-based evidence into a final type decision.
 *
 * Rules (in priority order):
 * 1. Clicky keyword → Clicky (curve cannot reliably detect Clicky)
 * 2. Both agree → use their result, no review needed
 * 3. Curve has high confidence (≥ 0.8), keyword is Unknown → trust curve
 * 4. Both have opinions but disagree → use higher-confidence one, flag for review
 * 5. Only one has a non-Unknown result → use it
 * 6. Both Unknown → Unknown
 *
 * @param {{ type: string, confidence: number, signals: string[] }} curveResult
 * @param {{ type: string, confidence: number }} keywordResult
 * @returns {{ type: string, confidence: number, needsReview: boolean, signals: string[] }}
 */
function fuseEvidence(curveResult, keywordResult) {
  const ct = curveResult.type
  const cc = curveResult.confidence
  const kt = keywordResult.type
  const kc = keywordResult.confidence

  const signals = [...(curveResult.signals || [])]

  // Rule 1: Clicky keyword always wins (curve can't detect Clicky reliably)
  if (kt === 'Clicky') {
    return { type: 'Clicky', confidence: kc, needsReview: false, signals: [...signals, 'keyword:Clicky'] }
  }

  // Rule 2: Both agree
  if (ct === kt && ct !== 'Unknown') {
    return { type: ct, confidence: Math.max(cc, kc), needsReview: false, signals }
  }

  // Rule 3: Curve high confidence, keyword unknown → trust curve
  if (cc >= 0.8 && kt === 'Unknown') {
    return { type: ct, confidence: cc, needsReview: false, signals }
  }

  // Rule 4: Both have opinions but disagree → flag for review
  if (ct !== 'Unknown' && kt !== 'Unknown' && ct !== kt) {
    const winner = cc >= kc ? ct : kt
    const winConf = cc >= kc ? cc : kc
    return {
      type: winner,
      confidence: winConf,
      needsReview: true,
      signals: [...signals, `conflict:curve=${ct}(${cc}),keyword=${kt}(${kc})`],
    }
  }

  // Rule 5: Only one has a result
  if (ct !== 'Unknown') {
    return { type: ct, confidence: cc, needsReview: cc < REVIEW_CONFIDENCE_THRESHOLD, signals }
  }
  if (kt !== 'Unknown') {
    return { type: kt, confidence: kc, needsReview: kc < REVIEW_CONFIDENCE_THRESHOLD, signals: [...signals, `keyword:${kt}`] }
  }

  // Rule 6: Both Unknown
  return { type: 'Unknown', confidence: 0, needsReview: true, signals: [...signals, 'no_evidence'] }
}

/**
 * Recursively scan a data directory and return one entry per switch.
 *
 * @param {string} dataDir  Root of the vendor tree (default: DATA_DIR)
 * @returns {{ dirPath: string, vendor: string, name: string }[]}
 */
function scanSwitchDirs(dataDir) {
  const entries = []

  function walk(dir, vendor) {
    let children
    try {
      children = fs.readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }

    for (const child of children) {
      if (!child.isDirectory()) continue
      const childPath = path.join(dir, child.name)
      const readmePath = path.join(childPath, 'README.md')

      if (fs.existsSync(readmePath)) {
        // Read name from frontmatter (fallback to dir name)
        let name = child.name
        try {
          const { data } = readFrontmatter(readmePath)
          if (data.name) name = data.name
        } catch { /* ignore */ }

        entries.push({ dirPath: childPath, vendor, name })
      }

      // Recurse (sub-families, e.g. Cherry/MX/Red)
      walk(childPath, vendor)
    }
  }

  let vendors
  try {
    vendors = fs.readdirSync(dataDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
  } catch {
    return []
  }

  for (const vendor of vendors) {
    walk(path.join(dataDir, vendor), vendor)
  }

  return entries
}

// ── CLI ───────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = {
    dryRun: true,
    apply: false,
    vendor: null,
    reviewOnly: false,
    limit: null,
  }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--apply') { args.dryRun = false; args.apply = true }
    else if (a === '--dry-run') { args.dryRun = true; args.apply = false }
    else if (a === '--vendor') args.vendor = argv[++i]
    else if (a === '--review-only') args.reviewOnly = true
    else if (a === '--limit') args.limit = parseInt(argv[++i], 10)
  }
  return args
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')

  console.log(`\n🔍  SwitchAtlas — classify:metadata`)
  console.log(`    mode: ${args.apply ? '--apply (WRITING)' : '--dry-run'}`)
  if (args.vendor) console.log(`    vendor filter: ${args.vendor}`)
  console.log()

  // ── Gather switches ───────────────────────────────────────────────────────
  let entries = scanSwitchDirs(DATA_DIR)

  if (args.vendor) {
    entries = entries.filter((e) => e.vendor.toLowerCase() === args.vendor.toLowerCase())
  }
  if (args.limit) {
    entries = entries.slice(0, args.limit)
  }

  console.log(`  Found ${entries.length} switches to classify`)

  // ── Per-switch classification ─────────────────────────────────────────────
  const results = []
  const vendorCounts = {}

  for (const entry of entries) {
    const { dirPath, vendor, name } = entry

    // Read existing frontmatter
    let existingType = 'Unknown'
    let existingSound
    let sourceUrl = ''
    try {
      const { data } = readFrontmatter(path.join(dirPath, 'README.md'))
      existingType = data.type || 'Unknown'
      existingSound = data.sound
      // Accept multiple source patterns
      if (data.sourceUrl) sourceUrl = data.sourceUrl
      else if (data.sources?.url) sourceUrl = data.sources.url
      else if (Array.isArray(data.sources?.images) && data.sources.images[0]?.sourceUrl) {
        sourceUrl = data.sources.images[0].sourceUrl
      }
    } catch { /* ignore */ }

    // Force-curve inference
    const csvPath =
      fs.existsSync(path.join(dirPath, 'force-curve.csv'))
        ? path.join(dirPath, 'force-curve.csv')
        : fs.existsSync(path.join(dirPath, 'force-curve-simu.csv'))
          ? path.join(dirPath, 'force-curve-simu.csv')
          : null

    const curveResult = csvPath
      ? inferTypeFromCurve(csvPath)
      : { type: 'Unknown', confidence: 0, signals: ['no_csv'] }

    // Keyword inference
    const keywordResult = inferTypeFromKeywords(name, sourceUrl)

    // Sound inference
    const inferredSound = inferSound(name, sourceUrl, existingSound)

    // Fuse
    const fused = fuseEvidence(curveResult, keywordResult)

    results.push({
      vendor,
      name,
      dirPath,
      existingType,
      inferredType: fused.type,
      confidence: fused.confidence,
      needsReview: fused.needsReview,
      signals: fused.signals,
      inferredSound,
      existingSound,
    })

    // Apply if requested and type changed
    if (args.apply && fused.type !== 'Unknown') {
      const patch = {}
      if (fused.type !== existingType) patch.type = fused.type
      if (inferredSound !== undefined && inferredSound !== existingSound) {
        patch.sound = inferredSound
      }
      if (Object.keys(patch).length > 0) {
        writeFrontmatterPatch(path.join(dirPath, 'README.md'), patch)
      }
    }

    // Track vendor counts
    if (!vendorCounts[vendor]) {
      vendorCounts[vendor] = { Linear: 0, Tactile: 0, Clicky: 0, Unknown: 0, total: 0 }
    }
    vendorCounts[vendor][fused.type] = (vendorCounts[vendor][fused.type] || 0) + 1
    vendorCounts[vendor].total += 1
  }

  // ── Compute summary ───────────────────────────────────────────────────────
  const totals = results.reduce(
    (acc, r) => {
      acc[r.inferredType] = (acc[r.inferredType] || 0) + 1
      if (r.needsReview) acc.review += 1
      return acc
    },
    { Linear: 0, Tactile: 0, Clicky: 0, Unknown: 0, review: 0 },
  )

  // ── Write reports ─────────────────────────────────────────────────────────
  fs.mkdirSync(REPORTS_DIR, { recursive: true })

  if (!args.reviewOnly) {
    const report = {
      generated: new Date().toISOString(),
      mode: args.apply ? 'apply' : 'dry-run',
      total: results.length,
      summary: totals,
      byVendor: vendorCounts,
    }
    const reportPath = path.join(REPORTS_DIR, `report-${timestamp}.json`)
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
    console.log(`\n  📄 Report: ${reportPath}`)
  }

  // Review CSV (conflicts + low confidence)
  const reviewItems = results.filter((r) => r.needsReview || r.inferredType === 'Unknown')
  if (reviewItems.length > 0) {
    const csvLines = [
      'vendor,name,existing_type,curve_inferred,keyword_inferred,final_type,confidence,signals',
      ...reviewItems.map((r) =>
        [
          r.vendor,
          `"${r.name}"`,
          r.existingType,
          r.signals.find((s) => s.startsWith('drop=')) ? 'curve' : 'no_csv',
          '',
          r.inferredType,
          r.confidence.toFixed(2),
          `"${r.signals.join('; ')}"`,
        ].join(','),
      ),
    ]
    const reviewPath = path.join(REPORTS_DIR, `review-${timestamp}.csv`)
    fs.writeFileSync(reviewPath, csvLines.join('\n'))
    console.log(`  📋 Review CSV: ${reviewPath} (${reviewItems.length} items)`)
  }

  // ── Print summary ─────────────────────────────────────────────────────────
  console.log('\n  ─── Classification Summary ─────────────────────────')
  console.log(`  Total switches : ${results.length}`)
  console.log(`  Linear         : ${totals.Linear}`)
  console.log(`  Tactile        : ${totals.Tactile}`)
  console.log(`  Clicky         : ${totals.Clicky}`)
  console.log(`  Unknown        : ${totals.Unknown}`)
  console.log(`  Needs review   : ${totals.review}`)
  console.log(`  Mode           : ${args.apply ? 'APPLIED (READMEs updated)' : 'dry-run (no files written)'}`)
  console.log()
}

// Only run main() when invoked directly (not when required by tests)
if (require.main === module) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}

module.exports = { inferTypeFromKeywords, inferSound, fuseEvidence, scanSwitchDirs }
