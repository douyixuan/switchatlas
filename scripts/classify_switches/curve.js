/**
 * scripts/classify_switches/curve.js
 *
 * Force-curve shape classifier.
 * Reads a ThereminGoat-format CSV and returns {type, confidence, signals}.
 *
 * Decision logic:
 *  - Tactile: clear bump in the 0.3–3.0 mm press zone (peak then ≥15% force drop)
 *  - Linear:  no such bump
 *  - Clicky:  NOT determined here — requires keyword evidence (handled by runner)
 *  - Unknown: file missing, parse error, or insufficient data
 */
'use strict'

const fs = require('node:fs')

// Bump-detection parameters
const BUMP_ZONE_START_MM = 0.3   // ignore pre-travel noise below this
const BUMP_ZONE_END_MM = 3.0     // stop before hard bottom-out spike
const BUMP_EARLY_END_MM = 1.5    // tactile bumps occur before this displacement
const BUMP_DROP_THRESHOLD = 0.15 // 15 % force drop after early peak → Tactile
const MIN_ZONE_POINTS = 20       // need enough resolution to detect a bump

/**
 * Parse a ThereminGoat force-curve CSV.
 * Format:
 *   Row 1-5: metadata (Maximum / Minimum / Average / Data Quantity / Number of NG)
 *   Row 6:   column header  (No.,Force,Unit,Displacement,Unit,...)
 *   Row 7+:  data           (1,5.0,gf,0.100,mm,OK,...)
 *
 * Returns an array of {force, displacement} in original row order (time order).
 *
 * @param {string} csvPath  Absolute path to the CSV file
 * @returns {{force: number, displacement: number}[]}
 */
function parseCsv(csvPath) {
  const content = fs.readFileSync(csvPath, 'utf-8')
  const lines = content.split('\n')
  const points = []
  let headerSeen = false

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    const parts = trimmed.split(',')
    if (parts.length < 4) continue

    const col0 = parts[0].trim()

    if (!headerSeen) {
      // The header row has "No." in column 0
      if (col0.toLowerCase() === 'no.') {
        headerSeen = true
      }
      // All rows before (and including) the header row are skipped
      continue
    }

    // Data rows: col0 is a positive integer
    if (isNaN(Number(col0)) || Number(col0) <= 0) continue

    const force = parseFloat(parts[1])
    const displacement = parseFloat(parts[3])

    if (isNaN(force) || isNaN(displacement)) continue

    points.push({ force, displacement })
  }

  return points
}

/**
 * Infer the switch type from its force-curve CSV.
 *
 * @param {string} csvPath  Absolute path to a force-curve.csv or force-curve-simu.csv
 * @returns {{ type: 'Linear'|'Tactile'|'Unknown', confidence: number, signals: string[] }}
 */
function inferTypeFromCurve(csvPath) {
  if (!fs.existsSync(csvPath)) {
    return { type: 'Unknown', confidence: 0, signals: ['file_not_found'] }
  }

  let points
  try {
    points = parseCsv(csvPath)
  } catch {
    return { type: 'Unknown', confidence: 0, signals: ['parse_error'] }
  }

  if (points.length === 0) {
    return { type: 'Unknown', confidence: 0, signals: ['no_data'] }
  }

  // ── 1. Find the press phase (rows 0 → peak-displacement index) ──────────────
  //
  // The CSV records a full press-and-release cycle.  The press phase ends at
  // the row with the highest displacement value.
  let maxDispIdx = 0
  for (let i = 1; i < points.length; i++) {
    if (points[i].displacement > points[maxDispIdx].displacement) {
      maxDispIdx = i
    }
  }
  const pressPhase = points.slice(0, maxDispIdx + 1)

  // ── 2. Extract the bump detection zone ──────────────────────────────────────
  const bumpZone = pressPhase.filter(
    (p) =>
      p.displacement >= BUMP_ZONE_START_MM && p.displacement <= BUMP_ZONE_END_MM,
  )

  if (bumpZone.length < MIN_ZONE_POINTS) {
    return { type: 'Unknown', confidence: 0, signals: ['insufficient_data'] }
  }

  // ── 3. Find the force peak within the EARLY part of the bump zone ───────────
  //
  // Tactile bumps occur early in travel (0.3–1.5 mm).  We look for the maximum
  // force in that window only.  For linear switches the force is still rising
  // at 1.5 mm, so the "early peak" will be at the boundary — and the minimum
  // force that follows will be ≥ early peak (no drop), giving dropRatio ≤ 0.
  const earlyZone = bumpZone.filter((p) => p.displacement <= BUMP_EARLY_END_MM)

  if (earlyZone.length < 5) {
    return { type: 'Unknown', confidence: 0, signals: ['insufficient_early_data'] }
  }

  let earlyPeakIdx = 0
  for (let i = 1; i < earlyZone.length; i++) {
    if (earlyZone[i].force > earlyZone[earlyPeakIdx].force) earlyPeakIdx = i
  }
  const earlyPeak = earlyZone[earlyPeakIdx]

  // ── 4. Measure the force drop after the early peak ──────────────────────────
  const afterPeak = bumpZone.filter((p) => p.displacement > earlyPeak.displacement)

  if (afterPeak.length < 5) {
    return { type: 'Linear', confidence: 0.6, signals: ['short_after_peak'] }
  }

  const minAfterPeak = afterPeak.reduce(
    (min, p) => (p.force < min ? p.force : min),
    afterPeak[0].force,
  )

  const peakForce = earlyPeak.force
  const dropRatio = (peakForce - minAfterPeak) / peakForce

  if (dropRatio >= BUMP_DROP_THRESHOLD) {
    // Clear bump → Tactile.  Higher drop = higher confidence.
    const confidence = Math.min(0.5 + dropRatio * 2, 1.0)
    return {
      type: 'Tactile',
      confidence: +confidence.toFixed(2),
      signals: [`drop=${dropRatio.toFixed(2)}`],
    }
  }

  // Negligible drop → Linear.
  const confidence = Math.min(
    0.6 + (0.4 * (BUMP_DROP_THRESHOLD - dropRatio)) / BUMP_DROP_THRESHOLD,
    1.0,
  )
  return {
    type: 'Linear',
    confidence: +confidence.toFixed(2),
    signals: [`drop=${dropRatio.toFixed(2)}`],
  }
}

module.exports = { inferTypeFromCurve, parseCsv }
