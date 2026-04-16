const fs = require('fs')
const path = require('path')

const DATA_DIR = path.join(__dirname, '..', 'data', 'vendors')
const PUBLIC_DIR = path.join(__dirname, '..', 'public', 'images', 'vendors')

function toSlug(relativePath) {
  return relativePath
    .toLowerCase()
    .replace(/[\/\\]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function findSwitchDirs(dir) {
  const results = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const full = path.join(dir, entry.name)
    if (fs.existsSync(path.join(full, 'README.md'))) results.push(full)
    results.push(...findSwitchDirs(full))
  }
  return results
}

const vendors = fs
  .readdirSync(DATA_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)

let copied = 0

for (const vendor of vendors) {
  const vendorDir = path.join(DATA_DIR, vendor)
  for (const dir of findSwitchDirs(vendorDir)) {
    const rel = path.relative(vendorDir, dir)
    const slug = toSlug(rel)
    const images = fs
      .readdirSync(dir)
      .filter((f) => /\.(jpg|jpeg|png|gif|webp)$/i.test(f))

    if (images.length === 0) continue

    const dest = path.join(PUBLIC_DIR, vendor, slug)
    fs.mkdirSync(dest, { recursive: true })

    for (const img of images) {
      const src = path.join(dir, img)
      const dst = path.join(dest, img)
      if (!fs.existsSync(dst)) {
        fs.copyFileSync(src, dst)
        copied++
      }
    }
  }
}

console.log(`Copied ${copied} images to public/images/vendors/`)
