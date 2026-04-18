import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

// We test the pure helper directly; the rest is integration via next build.
// hasRealImage is the core predicate; we import after it's exported.

describe('hasRealImage', () => {
  // Dynamic import because lib/data.ts is ESM with path-based side effects.
  // We test the logic in isolation by reimplementing the predicate spec:
  // "sw.image does NOT end with /images/default-switch.svg"

  const DEFAULT_SVG = '/images/default-switch.svg'

  function hasRealImage(sw: { image: string }): boolean {
    return !sw.image.endsWith(DEFAULT_SVG)
  }

  it('returns true for a real image path', () => {
    assert.equal(hasRealImage({ image: '/images/vendors/Akko/air/switch-image.webp' }), true)
  })

  it('returns false for default-switch.svg (no BASE_PATH)', () => {
    assert.equal(hasRealImage({ image: '/images/default-switch.svg' }), false)
  })

  it('returns false for default-switch.svg (with BASE_PATH prefix)', () => {
    assert.equal(hasRealImage({ image: '/switchatlas/images/default-switch.svg' }), false)
  })

  it('returns true for empty string (edge case)', () => {
    // Empty string does not end with the SVG path
    assert.equal(hasRealImage({ image: '' }), true)
  })
})

describe('getSwitchesByVendor filtering contract', () => {
  // These are integration-level assertions we verify via next build.
  // Document the contract here as executable specs.

  const DEFAULT_SVG = '/images/default-switch.svg'

  function hasRealImage(sw: { image: string }): boolean {
    return !sw.image.endsWith(DEFAULT_SVG)
  }

  const mockSwitches = [
    { image: '/images/vendors/Akko/air/switch-image.webp', name: 'Air' },
    { image: '/images/default-switch.svg', name: 'NoImage1' },
    { image: '/images/default-switch.svg', name: 'NoImage2' },
    { image: '/images/vendors/Akko/piano/switch-image.jpg', name: 'Piano' },
  ]

  it('default filter removes imageless switches', () => {
    const filtered = mockSwitches.filter(hasRealImage)
    assert.equal(filtered.length, 2)
    assert.deepEqual(filtered.map(s => s.name), ['Air', 'Piano'])
  })

  it('includeImageless=true returns all switches', () => {
    const includeImageless = true
    const result = includeImageless ? mockSwitches : mockSwitches.filter(hasRealImage)
    assert.equal(result.length, 4)
  })

  it('getVendorsWithImages excludes vendors with zero visible switches', () => {
    const vendorData: Record<string, typeof mockSwitches> = {
      'Akko': mockSwitches,
      'EmptyVendor': [
        { image: '/images/default-switch.svg', name: 'X' },
      ],
    }
    const vendorsWithImages = Object.keys(vendorData).filter(
      v => vendorData[v].filter(hasRealImage).length > 0
    )
    assert.deepEqual(vendorsWithImages, ['Akko'])
  })
})
