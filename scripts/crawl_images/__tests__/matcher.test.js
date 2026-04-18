const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')
const {
  matchProducts,
  normalizeTitleForMatch,
  normalizeDirNameForMatch,
  stripNoise,
} = require('../matcher')

function makeFakeData() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-data-'))
  const mk = (rel) => {
    const full = path.join(tmp, rel)
    fs.mkdirSync(full, { recursive: true })
    fs.writeFileSync(path.join(full, 'README.md'), '---\nname: x\n---\n')
    return full
  }
  mk('Akko/CS Jelly Black')
  mk('Akko/Cream Black V3 Pro')
  mk('Akko/V3 Cream Yellow Pro')
  mk('Outemu/JingJing')
  mk('Gateron/Oil King')
  return tmp
}

test('stripNoise removes packaging / pin / type tokens', () => {
  assert.equal(stripNoise('Akko CS Jelly Black 5-Pin'), 'Akko CS Jelly Black')
  assert.equal(
    stripNoise('Outemu JingJing Silent Linear Switches (10PCS)'),
    'Outemu JingJing',
  )
  assert.equal(stripNoise('Gateron Oil King Switch x10'), 'Gateron Oil King')
  assert.equal(
    stripNoise('Gateron Magnetic Jade Hall Effect Linear'),
    'Gateron Jade',
  )
})

test('normalizeTitleForMatch strips leading vendor and noise', () => {
  assert.equal(
    normalizeTitleForMatch('Outemu', 'Outemu JingJing Silent Linear Switches (10PCS)'),
    'jingjing',
  )
  assert.equal(
    normalizeTitleForMatch('Akko', 'Akko CS Jelly Black 5-Pin Switches'),
    'cs-jelly-black',
  )
  assert.equal(
    normalizeTitleForMatch('Akko', 'Akko Cream Black V3 Pro'),
    'cream-black-v3-pro',
  )
})

test('normalizeDirNameForMatch matches the title pipeline', () => {
  assert.equal(normalizeDirNameForMatch('CS Jelly Black'), 'cs-jelly-black')
  assert.equal(normalizeDirNameForMatch('Cream Black V3 Pro'), 'cream-black-v3-pro')
})

test('matchProducts produces matched / unmatched / vendor-skipped buckets', () => {
  const dataDir = makeFakeData()
  try {
    const records = [
      // should match
      {
        vendor: 'Akko',
        title: 'Akko CS Jelly Black 5-Pin Switches',
        sourceUrl: 'https://x/y/1',
        images: [{ src: 'a', position: 1 }],
      },
      {
        vendor: 'Outemu',
        title: 'Outemu JingJing Silent Linear Switches (10PCS)',
        sourceUrl: 'https://x/y/2',
        images: [{ src: 'b', position: 1 }],
      },
      // unmatched (not in dirs)
      {
        vendor: 'Akko',
        title: 'Akko Lavender Lake Mystery Switch',
        sourceUrl: 'https://x/y/3',
        images: [],
      },
      // skipped vendor (not in whitelist)
      {
        vendor: 'WeirdoCorp',
        title: 'Some Switch',
        sourceUrl: 'https://x/y/4',
        images: [],
      },
    ]
    const result = matchProducts(records, { dataDir })
    assert.equal(result.matched.length, 2)
    assert.equal(result.unmatched.length, 1)
    assert.equal(result.skippedVendor.length, 1)
    assert.equal(result.ambiguous.length, 0)

    const matched = result.matched.map((m) => m.normalizedSlug).sort()
    assert.deepEqual(matched, ['cs-jelly-black', 'jingjing'])
  } finally {
    fs.rmSync(dataDir, { recursive: true, force: true })
  }
})
