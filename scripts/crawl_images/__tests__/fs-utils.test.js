const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')
const { toSlug, findSwitchDirs, listVendors } = require('../lib/fs-utils')

test('toSlug normalizes paths consistent with lib/data.ts', () => {
  assert.equal(toSlug('Cream Black V3 Pro'), 'cream-black-v3-pro')
  assert.equal(toSlug('CS Jelly Black'), 'cs-jelly-black')
  assert.equal(toSlug('x Gateron White'), 'x-gateron-white')
  assert.equal(toSlug('Cilantro Prototype (Dark Stem)'), 'cilantro-prototype-dark-stem')
  assert.equal(toSlug('Sub-Folder/Switch Name'), 'sub-folder-switch-name')
})

test('findSwitchDirs finds dirs with README.md', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-'))
  try {
    fs.mkdirSync(path.join(tmp, 'A'))
    fs.writeFileSync(path.join(tmp, 'A', 'README.md'), '')
    fs.mkdirSync(path.join(tmp, 'B'))
    // no readme in B
    fs.mkdirSync(path.join(tmp, 'B', 'C'))
    fs.writeFileSync(path.join(tmp, 'B', 'C', 'README.md'), '')
    const dirs = findSwitchDirs(tmp).map((d) => path.relative(tmp, d)).sort()
    assert.deepEqual(dirs, ['A', 'B/C'])
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true })
  }
})

test('listVendors returns sorted directory names', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-'))
  try {
    fs.mkdirSync(path.join(tmp, 'Zeal'))
    fs.mkdirSync(path.join(tmp, 'Akko'))
    fs.writeFileSync(path.join(tmp, 'README.md'), '')
    assert.deepEqual(listVendors(tmp), ['Akko', 'Zeal'])
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true })
  }
})
