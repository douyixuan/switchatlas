/**
 * scripts/classify_switches/__tests__/curve.test.js
 *
 * Tests for the force-curve shape classifier.
 * Run: node --test scripts/classify_switches/__tests__/curve.test.js
 */
const test = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
const fs = require('node:fs')
const os = require('node:os')

const { inferTypeFromCurve, parseCsv } = require('../curve')

const FIXTURES = path.join(__dirname, '../fixtures')
const LINEAR_CSV = path.join(FIXTURES, 'linear.csv')
const TACTILE_CSV = path.join(FIXTURES, 'tactile.csv')

// ---- parseCsv ----------------------------------------------------------------

test('parseCsv: skips metadata + header rows, returns time-ordered data points', () => {
  const points = parseCsv(LINEAR_CSV)
  // 40 press + 40 release rows
  assert.ok(points.length >= 40, `expected >= 40 points, got ${points.length}`)
  // first point should have positive displacement
  assert.ok(points[0].displacement >= 0)
  assert.ok(points[0].force >= 0)
  // each point has force and displacement numbers
  for (const p of points) {
    assert.equal(typeof p.force, 'number')
    assert.equal(typeof p.displacement, 'number')
  }
})

test('parseCsv: returns empty array for file with no data rows', () => {
  const tmp = path.join(os.tmpdir(), `curve-empty-${Date.now()}.csv`)
  fs.writeFileSync(tmp, 'Maximum,0,@,No.1,,,,,\nMinimum,0,@,No.1,,,,,\nAverage,0,,,,,,,,\nData Quantity,0,,,,,,,,\nNumber of NG,0,,,,,,,,\nNo.,Force,Unit,Displacement,Unit,Judge,Position,Time,Date,\n')
  const points = parseCsv(tmp)
  fs.unlinkSync(tmp)
  assert.equal(points.length, 0)
})

// ---- inferTypeFromCurve — file errors ----------------------------------------

test('inferTypeFromCurve: returns Unknown if file not found', () => {
  const result = inferTypeFromCurve('/nonexistent/path/force-curve.csv')
  assert.equal(result.type, 'Unknown')
  assert.equal(result.confidence, 0)
  assert.ok(result.signals.includes('file_not_found'))
})

test('inferTypeFromCurve: returns Unknown for empty CSV', () => {
  const tmp = path.join(os.tmpdir(), `curve-empty2-${Date.now()}.csv`)
  fs.writeFileSync(tmp, '')
  const result = inferTypeFromCurve(tmp)
  fs.unlinkSync(tmp)
  assert.equal(result.type, 'Unknown')
  assert.equal(result.confidence, 0)
})

test('inferTypeFromCurve: returns Unknown if data rows < 20 in bump zone', () => {
  // Only 5 data rows — below minimum threshold
  const lines = [
    'Maximum,50,@,No.5,,,,,,',
    'Minimum,5,@,No.1,,,,,,',
    'Average,25,,,,,,,,',
    'Data Quantity,5,,,,,,,,',
    'Number of NG,0,,,,,,,,',
    'No.,Force,Unit,Displacement,Unit,Judge,Position,Time,Date,',
    '1,10.0,gf,0.500,mm,OK,--,,,',
    '2,20.0,gf,1.000,mm,OK,--,,,',
    '3,30.0,gf,1.500,mm,OK,--,,,',
    '4,40.0,gf,2.000,mm,OK,--,,,',
    '5,50.0,gf,2.500,mm,OK,--,,,',
  ].join('\n')
  const tmp = path.join(os.tmpdir(), `curve-sparse-${Date.now()}.csv`)
  fs.writeFileSync(tmp, lines)
  const result = inferTypeFromCurve(tmp)
  fs.unlinkSync(tmp)
  assert.equal(result.type, 'Unknown')
  assert.equal(result.confidence, 0)
})

// ---- inferTypeFromCurve — classification ------------------------------------

test('inferTypeFromCurve: classifies linear fixture as Linear', () => {
  const result = inferTypeFromCurve(LINEAR_CSV)
  assert.equal(result.type, 'Linear', `Expected Linear, got ${result.type} (signals: ${result.signals})`)
  assert.ok(result.confidence > 0.5, `confidence too low: ${result.confidence}`)
})

test('inferTypeFromCurve: classifies tactile fixture as Tactile', () => {
  const result = inferTypeFromCurve(TACTILE_CSV)
  assert.equal(result.type, 'Tactile', `Expected Tactile, got ${result.type} (signals: ${result.signals})`)
  assert.ok(result.confidence > 0.5, `confidence too low: ${result.confidence}`)
})

test('inferTypeFromCurve: result always has type, confidence, and signals fields', () => {
  for (const csv of [LINEAR_CSV, TACTILE_CSV]) {
    const result = inferTypeFromCurve(csv)
    assert.ok(['Linear', 'Tactile', 'Clicky', 'Unknown'].includes(result.type))
    assert.equal(typeof result.confidence, 'number')
    assert.ok(Array.isArray(result.signals))
  }
})

// ---- Integration test: real switch data -------------------------------------

test('inferTypeFromCurve: Outemu Banana Green (real tactile) → Tactile', () => {
  const bananaCsv = path.join(
    __dirname,
    '../../../../data/vendors/Outemu/Banana Green/force-curve-simu.csv',
  )
  if (!fs.existsSync(bananaCsv)) {
    // Skip gracefully if data not present in CI
    return
  }
  const result = inferTypeFromCurve(bananaCsv)
  assert.equal(result.type, 'Tactile', `Expected Tactile, got ${result.type} (signals: ${result.signals})`)
})

test('inferTypeFromCurve: Akko Air (real linear) → Linear', () => {
  const airCsv = path.join(
    __dirname,
    '../../../../data/vendors/Akko/Air/force-curve.csv',
  )
  if (!fs.existsSync(airCsv)) {
    return
  }
  const result = inferTypeFromCurve(airCsv)
  assert.equal(result.type, 'Linear', `Expected Linear, got ${result.type} (signals: ${result.signals})`)
})
