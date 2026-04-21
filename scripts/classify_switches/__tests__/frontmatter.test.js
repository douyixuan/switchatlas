/**
 * scripts/classify_switches/__tests__/frontmatter.test.js
 *
 * Tests for the idempotent frontmatter read/write module.
 * Run: node --test scripts/classify_switches/__tests__/frontmatter.test.js
 */
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')

const { readFrontmatter, writeFrontmatterPatch } = require('../frontmatter')

function makeTempReadme(content) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-fm-'))
  const p = path.join(dir, 'README.md')
  fs.writeFileSync(p, content)
  return p
}

const SAMPLE_README = `---
id: test-switch
name: Test Switch
vendor: Acme
type: Unknown
force:
  actuation: 45
  bottom_out: 65
sound: Silent
---

# Test Switch

Some description.
`

// ---- readFrontmatter --------------------------------------------------------

test('readFrontmatter: returns parsed data and content', () => {
  const p = makeTempReadme(SAMPLE_README)
  const { data, content } = readFrontmatter(p)
  assert.equal(data.name, 'Test Switch')
  assert.equal(data.type, 'Unknown')
  assert.equal(data.sound, 'Silent')
  assert.ok(content.includes('# Test Switch'))
  fs.rmSync(path.dirname(p), { recursive: true })
})

test('readFrontmatter: handles README with no frontmatter', () => {
  const p = makeTempReadme('# Just a heading\n\nSome text.\n')
  const { data, content } = readFrontmatter(p)
  assert.deepEqual(data, {})
  assert.ok(content.includes('# Just a heading'))
  fs.rmSync(path.dirname(p), { recursive: true })
})

// ---- writeFrontmatterPatch --------------------------------------------------

test('writeFrontmatterPatch: updates only specified fields', () => {
  const p = makeTempReadme(SAMPLE_README)
  writeFrontmatterPatch(p, { type: 'Linear' })
  const { data } = readFrontmatter(p)
  assert.equal(data.type, 'Linear')
  // Other fields preserved
  assert.equal(data.name, 'Test Switch')
  assert.equal(data.vendor, 'Acme')
  assert.equal(data.sound, 'Silent')
  assert.deepEqual(data.force, { actuation: 45, bottom_out: 65 })
  fs.rmSync(path.dirname(p), { recursive: true })
})

test('writeFrontmatterPatch: preserves markdown body content', () => {
  const p = makeTempReadme(SAMPLE_README)
  writeFrontmatterPatch(p, { type: 'Tactile' })
  const raw = fs.readFileSync(p, 'utf-8')
  assert.ok(raw.includes('# Test Switch'))
  assert.ok(raw.includes('Some description.'))
  fs.rmSync(path.dirname(p), { recursive: true })
})

test('writeFrontmatterPatch: is idempotent (same call twice = same result)', () => {
  const p = makeTempReadme(SAMPLE_README)
  writeFrontmatterPatch(p, { type: 'Linear' })
  const first = fs.readFileSync(p, 'utf-8')
  writeFrontmatterPatch(p, { type: 'Linear' })
  const second = fs.readFileSync(p, 'utf-8')
  assert.equal(first, second)
  fs.rmSync(path.dirname(p), { recursive: true })
})

test('writeFrontmatterPatch: can set sound field', () => {
  const p = makeTempReadme(SAMPLE_README)
  writeFrontmatterPatch(p, { sound: 'Silent' })
  const { data } = readFrontmatter(p)
  assert.equal(data.sound, 'Silent')
  fs.rmSync(path.dirname(p), { recursive: true })
})

test('writeFrontmatterPatch: does not overwrite existing sound if patch has undefined sound', () => {
  const p = makeTempReadme(SAMPLE_README)
  writeFrontmatterPatch(p, { type: 'Linear' }) // no sound field in patch
  const { data } = readFrontmatter(p)
  assert.equal(data.sound, 'Silent') // original sound preserved
  fs.rmSync(path.dirname(p), { recursive: true })
})
