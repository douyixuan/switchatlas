import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { marked } from 'marked'
import type { Switch, SwitchDetail, ForceCurvePoint } from './types'

const DATA_DIR = path.join(process.cwd(), 'data', 'vendors')
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || ''

export function toSlug(relativePath: string): string {
  return relativePath
    .toLowerCase()
    .replace(/[\/\\]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function findSwitchDirs(dir: string): string[] {
  const results: string[] = []
  const entries = fs.readdirSync(dir, { withFileTypes: true })

  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const fullPath = path.join(dir, entry.name)
    const readmePath = path.join(fullPath, 'README.md')

    if (fs.existsSync(readmePath)) {
      results.push(fullPath)
    }

    const subDirs = findSwitchDirs(fullPath)
    results.push(...subDirs)
  }

  return results
}

function parseSwitchDir(dirPath: string, vendor: string): Switch | null {
  const readmePath = path.join(dirPath, 'README.md')
  if (!fs.existsSync(readmePath)) return null

  const raw = fs.readFileSync(readmePath, 'utf-8')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let data: any
  try {
    const parsed = matter(raw)
    data = parsed.data
  } catch {
    return null
  }

  const relativePath = path.relative(path.join(DATA_DIR, vendor), dirPath)
  const slug = toSlug(relativePath)

  const imageBase = `${BASE_PATH}/images/vendors/${vendor}/${slug}`

  const dirEntries = fs.readdirSync(dirPath)
  const allImageFiles = dirEntries
    .filter((f) => /\.(jpg|jpeg|png|webp)$/i.test(f))
    .filter((f) => !/^force-curve\./i.test(f))

  const primaryFile = allImageFiles.find((f) => /^switch-image\./i.test(f))
  const otherFiles = allImageFiles
    .filter((f) => !/^switch-image\./i.test(f))
    .sort()

  const orderedFiles = primaryFile
    ? [primaryFile, ...otherFiles]
    : otherFiles

  const images = orderedFiles.length > 0
    ? orderedFiles.map((f) => `${imageBase}/${f}`)
    : [`${BASE_PATH}/images/default-switch.svg`]

  const image = images[0]

  const switchImages = data.images || {}
  let curve: string | undefined
  if (switchImages.curve) {
    curve = `${imageBase}/${switchImages.curve}`
  }

  const hasCsv = fs.existsSync(path.join(dirPath, 'force-curve.csv'))
  const force = data.force || {}
  const travel = data.travel || {}

  return {
    slug,
    name: data.name || path.basename(dirPath),
    vendor: data.vendor || vendor,
    type: data.type || 'Unknown',
    force: {
      actuation: force.actuation || 0,
      bottom_out: force.bottom_out || 0,
    },
    travel: {
      actuation: travel.actuation || 0,
      total: travel.total || 0,
    },
    sound: data.sound,
    color: data.color,
    mount: data.mount,
    image,
    images,
    curve,
    hasForceCurveData: hasCsv || !!switchImages.curve,
  }
}

const DEFAULT_IMAGE_SUFFIX = '/images/default-switch.svg'

export function hasRealImage(sw: { image: string }): boolean {
  return !sw.image.endsWith(DEFAULT_IMAGE_SUFFIX)
}

export function getAllVendors(): string[] {
  return fs
    .readdirSync(DATA_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort()
}

export function getSwitchesByVendor(
  vendor: string,
  limit?: number,
  options?: { includeImageless?: boolean }
): Switch[] {
  const vendorDir = path.join(DATA_DIR, vendor)
  if (!fs.existsSync(vendorDir)) return []

  const dirs = findSwitchDirs(vendorDir)
  const switches: Switch[] = []

  for (const dir of dirs) {
    const sw = parseSwitchDir(dir, vendor)
    if (sw) switches.push(sw)
  }

  switches.sort((a, b) => {
    const aScore =
      (a.type !== 'Unknown' ? 2 : 0) +
      (a.force.actuation > 0 ? 1 : 0) +
      (hasRealImage(a) ? 3 : 0)
    const bScore =
      (b.type !== 'Unknown' ? 2 : 0) +
      (b.force.actuation > 0 ? 1 : 0) +
      (hasRealImage(b) ? 3 : 0)
    return bScore - aScore
  })

  const filtered = options?.includeImageless
    ? switches
    : switches.filter(hasRealImage)

  return limit ? filtered.slice(0, limit) : filtered
}

export function getVendorsWithImages(): string[] {
  return getAllVendors().filter(
    (v) => getSwitchesByVendor(v).length > 0
  )
}

const slugToPathMap = new Map<string, { vendor: string; dirPath: string }>()
let mapBuilt = false

function buildSlugMap() {
  if (mapBuilt) return
  const vendors = getAllVendors()
  for (const vendor of vendors) {
    const vendorDir = path.join(DATA_DIR, vendor)
    const dirs = findSwitchDirs(vendorDir)
    for (const dir of dirs) {
      const relativePath = path.relative(vendorDir, dir)
      const slug = toSlug(relativePath)
      slugToPathMap.set(`${vendor}/${slug}`, { vendor, dirPath: dir })
    }
  }
  mapBuilt = true
}

export function getSwitchBySlug(
  vendor: string,
  slug: string
): SwitchDetail | null {
  buildSlugMap()
  const entry = slugToPathMap.get(`${vendor}/${slug}`)
  if (!entry) return null

  const readmePath = path.join(entry.dirPath, 'README.md')
  if (!fs.existsSync(readmePath)) return null

  const raw = fs.readFileSync(readmePath, 'utf-8')
  let content: string
  try {
    const parsed = matter(raw)
    content = parsed.content
  } catch {
    return null
  }
  const bodyHtml = marked.parse(content) as string

  let bodyHtmlZh: string | undefined
  const readmeZhPath = path.join(entry.dirPath, 'README.zh.md')
  if (fs.existsSync(readmeZhPath)) {
    const rawZh = fs.readFileSync(readmeZhPath, 'utf-8')
    try {
      const parsedZh = matter(rawZh)
      bodyHtmlZh = marked.parse(parsedZh.content) as string
    } catch {
      // fall back to English
    }
  }

  const base = parseSwitchDir(entry.dirPath, vendor)
  if (!base) return null

  let forceCurveData: ForceCurvePoint[] | undefined
  const csvPath = path.join(entry.dirPath, 'force-curve.csv')
  if (fs.existsSync(csvPath)) {
    forceCurveData = parseForceCurve(csvPath)
  }

  return {
    ...base,
    bodyHtml,
    bodyHtmlZh,
    forceCurveData,
  }
}

export function getAllSwitches(limitPerVendor = 4): Switch[] {
  const vendors = getAllVendors()
  const all: Switch[] = []

  for (const vendor of vendors) {
    const switches = getSwitchesByVendor(vendor, limitPerVendor)
    all.push(...switches)
  }

  return all
}

export function getAllSwitchesFlat(): Switch[] {
  const vendors = getAllVendors()
  const all: Switch[] = []

  for (const vendor of vendors) {
    const switches = getSwitchesByVendor(vendor)
    all.push(...switches)
  }

  return all
}

export function parseForceCurve(csvPath: string): ForceCurvePoint[] {
  const raw = fs.readFileSync(csvPath, 'utf-8')
  const lines = raw.split('\n')

  const headerIndex = lines.findIndex(
    (line) => line.startsWith('No.') || line.startsWith('No,')
  )
  if (headerIndex === -1) return []

  const dataLines = lines.slice(headerIndex + 1).filter((l) => l.trim())
  const points: ForceCurvePoint[] = []

  const sampleInterval = Math.max(1, Math.floor(dataLines.length / 200))

  for (let i = 0; i < dataLines.length; i += sampleInterval) {
    const parts = dataLines[i].split(',')
    const force = parseFloat(parts[1])
    const displacement = parseFloat(parts[3])

    if (!isNaN(force) && !isNaN(displacement)) {
      points.push({ force, displacement })
    }
  }

  return points
}

export function copyImagesToPublic() {
  const vendors = getAllVendors()
  const publicBase = path.join(process.cwd(), 'public', 'images', 'vendors')

  for (const vendor of vendors) {
    const vendorDir = path.join(DATA_DIR, vendor)
    const dirs = findSwitchDirs(vendorDir)

    for (const dir of dirs) {
      const relativePath = path.relative(vendorDir, dir)
      const slug = toSlug(relativePath)
      const entries = fs.readdirSync(dir)

      const imageFiles = entries.filter((f) =>
        /\.(jpg|jpeg|png|gif|webp)$/i.test(f)
      )

      if (imageFiles.length > 0) {
        const destDir = path.join(publicBase, vendor, slug)
        fs.mkdirSync(destDir, { recursive: true })

        for (const img of imageFiles) {
          const src = path.join(dir, img)
          const dest = path.join(destDir, img)
          if (!fs.existsSync(dest)) {
            fs.copyFileSync(src, dest)
          }
        }
      }
    }
  }
}
