/**
 * scripts/classify_switches/__tests__/run.test.js
 *
 * Tests for the classify runner: keyword inference, sound inference,
 * evidence fusion, and report emission.
 *
 * Run: node --test scripts/classify_switches/__tests__/run.test.js
 */
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')

const {
  inferTypeFromKeywords,
  inferSound,
  fuseEvidence,
  scanSwitchDirs,
} = require('../run')

// ---- inferTypeFromKeywords --------------------------------------------------

test('inferTypeFromKeywords: detects Clicky from name', () => {
  const r = inferTypeFromKeywords('Box Navy', '')
  assert.equal(r.type, 'Clicky')
  assert.ok(r.confidence > 0)
})

test('inferTypeFromKeywords: detects Clicky from name with clicky keyword', () => {
  const r = inferTypeFromKeywords('Jade Clicky', '')
  assert.equal(r.type, 'Clicky')
})

test('inferTypeFromKeywords: detects Tactile from name', () => {
  const r = inferTypeFromKeywords('Brown Tactile', '')
  assert.equal(r.type, 'Tactile')
})

test('inferTypeFromKeywords: detects Linear from name', () => {
  const r = inferTypeFromKeywords('Red Linear', '')
  assert.equal(r.type, 'Linear')
})

test('inferTypeFromKeywords: returns Unknown when no keywords match', () => {
  const r = inferTypeFromKeywords('Oil King', '')
  assert.equal(r.type, 'Unknown')
  assert.equal(r.confidence, 0)
})

test('inferTypeFromKeywords: sourceUrl can trigger Clicky', () => {
  const r = inferTypeFromKeywords('Mystery Switch', 'https://example.com/blue-clicky-switches')
  assert.equal(r.type, 'Clicky')
})

// ---- inferSound -------------------------------------------------------------

test('inferSound: detects Silent from name', () => {
  assert.equal(inferSound('V2 Silent', '', undefined), 'Silent')
})

test('inferSound: detects Silent case-insensitively', () => {
  assert.equal(inferSound('SILENT Linear', '', undefined), 'Silent')
})

test('inferSound: detects Silent from sourceUrl', () => {
  assert.equal(inferSound('Mystery', 'https://shop.com/silent-switch', undefined), 'Silent')
})

test('inferSound: returns existing sound value if set and no silent keyword', () => {
  assert.equal(inferSound('Oil King', '', 'Thocky'), 'Thocky')
})

test('inferSound: returns undefined if no signal and no existing value', () => {
  assert.equal(inferSound('Oil King', '', undefined), undefined)
})

test('inferSound: does not overwrite existing sound for silent switch (already correct)', () => {
  assert.equal(inferSound('Silent V2', '', 'Silent'), 'Silent')
})

// ---- fuseEvidence -----------------------------------------------------------

test('fuseEvidence: high-confidence curve wins over unknown keyword', () => {
  const curveResult = { type: 'Linear', confidence: 0.9, signals: ['drop=0.02'] }
  const keywordResult = { type: 'Unknown', confidence: 0 }
  const { type } = fuseEvidence(curveResult, keywordResult)
  assert.equal(type, 'Linear')
})

test('fuseEvidence: Clicky keyword overrides curve result (curve cannot detect Clicky)', () => {
  const curveResult = { type: 'Linear', confidence: 0.8, signals: ['drop=0.02'] }
  const keywordResult = { type: 'Clicky', confidence: 0.7 }
  const { type, needsReview } = fuseEvidence(curveResult, keywordResult)
  assert.equal(type, 'Clicky')
  assert.equal(needsReview, false)
})

test('fuseEvidence: agreement between curve and keyword → high confidence, no review', () => {
  const curveResult = { type: 'Tactile', confidence: 0.85, signals: ['drop=0.35'] }
  const keywordResult = { type: 'Tactile', confidence: 0.7 }
  const { type, confidence, needsReview } = fuseEvidence(curveResult, keywordResult)
  assert.equal(type, 'Tactile')
  assert.ok(confidence >= 0.85)
  assert.equal(needsReview, false)
})

test('fuseEvidence: conflict between curve (Tactile) and keyword (Linear) → needs review', () => {
  const curveResult = { type: 'Tactile', confidence: 0.75, signals: ['drop=0.22'] }
  const keywordResult = { type: 'Linear', confidence: 0.6 }
  const { needsReview } = fuseEvidence(curveResult, keywordResult)
  assert.equal(needsReview, true)
})

test('fuseEvidence: result always has type, confidence, needsReview, signals', () => {
  const r = fuseEvidence(
    { type: 'Unknown', confidence: 0, signals: [] },
    { type: 'Unknown', confidence: 0 },
  )
  assert.ok(['Linear', 'Tactile', 'Clicky', 'Unknown'].includes(r.type))
  assert.equal(typeof r.confidence, 'number')
  assert.equal(typeof r.needsReview, 'boolean')
  assert.ok(Array.isArray(r.signals))
})

// ---- scanSwitchDirs ---------------------------------------------------------

test('scanSwitchDirs: finds all switch dirs with README.md', () => {
  // Build a temp data tree
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-scan-'))
  const mkSwitch = (vendor, name) => {
    const dir = path.join(root, vendor, name)
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(
      path.join(dir, 'README.md'),
      `---\nname: ${name}\nvendor: ${vendor}\n---\n# ${name}\n`,
    )
  }
  mkSwitch('Akko', 'Air')
  mkSwitch('Akko', 'Crystal')
  mkSwitch('TTC', 'ACE')

  const entries = scanSwitchDirs(root)
  assert.equal(entries.length, 3)
  const names = entries.map((e) => e.name).sort()
  assert.deepEqual(names, ['ACE', 'Air', 'Crystal'])

  fs.rmSync(root, { recursive: true })
})

test('scanSwitchDirs: returns dirPath, vendor, name for each entry', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-scan2-'))
  const dir = path.join(root, 'Akko', 'Air')
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(
    path.join(dir, 'README.md'),
    '---\nname: Air\nvendor: Akko\n---\n# Air\n',
  )

  const entries = scanSwitchDirs(root)
  assert.equal(entries.length, 1)
  assert.equal(entries[0].vendor, 'Akko')
  assert.equal(entries[0].name, 'Air')
  assert.ok(entries[0].dirPath.endsWith('Air'))

  fs.rmSync(root, { recursive: true })
})
