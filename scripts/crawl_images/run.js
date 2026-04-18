#!/usr/bin/env node
/**
 * scripts/crawl_images/run.js — orchestrator
 *
 * Usage:
 *   node scripts/crawl_images/run.js --dry-run
 *   node scripts/crawl_images/run.js --source lumekeebs --vendor Akko --limit 5
 *
 * Dry runs do NOT download anything; they only fetch catalogs, run the
 * matcher and emit a report. Use them to size R0 viability before turning
 * the downloader on.
 */
const path = require('node:path')
const fs = require('node:fs')

const { fetchCatalog: fetchLumekeebs } = require('./sources/lumekeebs')
const { fetchCatalog: fetchMilktooth } = require('./sources/milktooth')
const {
  matchProducts,
  writeMatchLogs,
  normalizeDirNameForMatch,
} = require('./matcher')
const { listVendors, findSwitchDirs } = require('./lib/fs-utils')
const { downloadMatched, RateLimiter } = require('./downloader')
const { writeAttribution } = require('./attribution')
const path2 = require('node:path')

const SOURCES = {
  lumekeebs: { fetchCatalog: fetchLumekeebs, priority: 10 },
  milktooth: { fetchCatalog: fetchMilktooth, priority: 20 },
}

function parseArgs(argv) {
  const args = {
    sources: [],
    vendor: null,
    dryRun: false,
    limit: null,
    multiImage: false,
    outDir: path.join(__dirname, 'reports'),
  }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--dry-run') args.dryRun = true
    else if (a === '--multi-image') args.multiImage = true
    else if (a === '--source') args.sources.push(argv[++i])
    else if (a === '--vendor') args.vendor = argv[++i]
    else if (a === '--limit') args.limit = parseInt(argv[++i], 10)
    else if (a === '--out') args.outDir = argv[++i]
    else if (a === '--help' || a === '-h') {
      console.log(
        'Usage: node scripts/crawl_images/run.js [--dry-run] [--source NAME] [--vendor V] [--limit N] [--multi-image]',
      )
      process.exit(0)
    }
  }
  if (args.sources.length === 0) args.sources = Object.keys(SOURCES)
  return args
}

function countSwitchesWithImages(dataDir) {
  let withImg = 0
  let total = 0
  for (const v of listVendors(dataDir)) {
    for (const dir of findSwitchDirs(path.join(dataDir, v))) {
      total++
      const files = fs.readdirSync(dir)
      const hasImg = files.some(
        (f) => /\.(jpe?g|png|webp|gif)$/i.test(f) && !/^force-curve\./i.test(f),
      )
      if (hasImg) withImg++
    }
  }
  return { total, withImg }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const dataDir = path.join(__dirname, '..', '..', 'data', 'vendors')
  fs.mkdirSync(args.outDir, { recursive: true })

  const before = countSwitchesWithImages(dataDir)
  console.log(
    `[baseline] ${before.withImg}/${before.total} switches have ≥1 image (${(
      (100 * before.withImg) /
      before.total
    ).toFixed(1)}%)`,
  )

  const allReports = []
  for (const sourceName of args.sources) {
    const source = SOURCES[sourceName]
    if (!source) {
      console.error(`Unknown source: ${sourceName}`)
      process.exit(2)
    }
    console.log(`[${sourceName}] fetching catalog…`)
    const catalogOpts = {}
    if (sourceName === 'milktooth') {
      // build candidate slug set from all switch dirs to pre-filter sitemap
      const candidates = new Set()
      for (const v of listVendors(dataDir)) {
        for (const dir of findSwitchDirs(path.join(dataDir, v))) {
          const rel = path.relative(path.join(dataDir, v), dir)
          candidates.add(normalizeDirNameForMatch(rel))
        }
      }
      catalogOpts.candidateSlugs = candidates
      catalogOpts.slugNormalizer = (s) => normalizeDirNameForMatch(s)
      catalogOpts.rateLimiter = new RateLimiter(1100)
      catalogOpts.onProgress = ({ fetched, total, found }) => {
        if (fetched % 20 === 0) {
          console.log(
            `[${sourceName}]   page ${fetched}/${total}, ${found} JSON-LD products extracted`,
          )
        }
      }
    }
    const records = await source.fetchCatalog(catalogOpts)
    console.log(`[${sourceName}] fetched ${records.length} products`)

    const result = matchProducts(records, { dataDir })
    writeMatchLogs(path.join(args.outDir, sourceName), result)

    let matched = result.matched
    if (args.vendor) {
      matched = matched.filter((m) => m.vendor === args.vendor)
    }
    if (args.limit) matched = matched.slice(0, args.limit)

    // count matched switches that *currently* have no image — those are the
    // ones that would actually move the coverage needle.
    let wouldDownload = 0
    for (const m of matched) {
      const files = fs.readdirSync(m.dirPath)
      const hasImg = files.some(
        (f) => /\.(jpe?g|png|webp|gif)$/i.test(f) && !/^force-curve\./i.test(f),
      )
      if (!hasImg) wouldDownload++
    }

    const report = {
      source: sourceName,
      timestamp: new Date().toISOString(),
      dryRun: args.dryRun,
      fetched: records.length,
      matched: result.matched.length,
      unmatched: result.unmatched.length,
      ambiguous: result.ambiguous.length,
      skipped_vendor: result.skippedVendor.length,
      filtered_to_match: matched.length,
      would_download_new: wouldDownload,
    }

    // matched-by-vendor breakdown
    const byVendor = {}
    for (const m of result.matched) {
      byVendor[m.vendor] = (byVendor[m.vendor] || 0) + 1
    }
    report.matched_by_vendor = byVendor

    allReports.push(report)

    const reportFile = path.join(
      args.outDir,
      `${sourceName}-${args.dryRun ? 'dry-' : ''}${Date.now()}.json`,
    )
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2))
    console.log(`[${sourceName}] report → ${path.relative(process.cwd(), reportFile)}`)
    console.log(
      `[${sourceName}] matched=${report.matched} unmatched=${report.unmatched} ambiguous=${report.ambiguous} would_download_new=${report.would_download_new}`,
    )
    console.log(`[${sourceName}] matched_by_vendor=${JSON.stringify(byVendor)}`)

    if (args.dryRun) {
      console.log(`[${sourceName}] dry-run → no downloads`)
      continue
    }
    console.log(`[${sourceName}] downloading ${matched.length} matched products…`)
    const dlStats = await downloadMatched(matched, { intervalMs: 1100 })

    // attribution: for every successful download, write into README.md
    let attrWritten = 0
    for (const r of dlStats.results) {
      if (r.action !== 'downloaded') continue
      const ok = writeAttribution(r.switchDir, {
        file: path2.basename(r.targetPath),
        site: sourceName,
        url: r.url,
        sourceUrl: matched.find((m) => m.dirPath === r.switchDir)?.product
          ?.sourceUrl,
        fetched: new Date().toISOString().slice(0, 10),
      })
      if (ok) attrWritten++
    }

    report.downloaded = dlStats.downloaded
    report.skipped = dlStats.skipped
    report.errors = dlStats.errors
    report.attribution_written = attrWritten

    console.log(
      `[${sourceName}] downloaded=${dlStats.downloaded} skipped=${dlStats.skipped} errors=${dlStats.errors} attribution=${attrWritten}`,
    )

    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2))
  }

  const after = countSwitchesWithImages(dataDir)
  console.log(
    `[final] ${after.withImg}/${after.total} switches have ≥1 image (${(
      (100 * after.withImg) /
      after.total
    ).toFixed(1)}%, +${after.withImg - before.withImg})`,
  )

  console.log('done.')
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e)
    process.exit(1)
  })
}

module.exports = { parseArgs, countSwitchesWithImages }
