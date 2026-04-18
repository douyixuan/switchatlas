const fs = require('fs')
const path = require('path')

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

function listVendors(dataDir) {
  return fs
    .readdirSync(dataDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort()
}

module.exports = { toSlug, findSwitchDirs, listVendors }
