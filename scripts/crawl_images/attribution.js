const matter = require('gray-matter')
const fs = require('node:fs')
const path = require('node:path')

/**
 * Idempotently append/merge an entry into the README.md `sources.images`
 * frontmatter array. Entries are uniqued by URL.
 *
 * @param {string} switchDir
 * @param {{file: string, site: string, url: string, sourceUrl?: string, fetched?: string}} entry
 */
function writeAttribution(switchDir, entry) {
  const readmePath = path.join(switchDir, 'README.md')
  if (!fs.existsSync(readmePath)) return false
  const raw = fs.readFileSync(readmePath, 'utf8')
  const parsed = matter(raw)
  const data = parsed.data || {}
  const sources = data.sources || {}
  const images = Array.isArray(sources.images) ? sources.images : []

  const existing = images.find((e) => e && e.url === entry.url)
  if (existing) {
    Object.assign(existing, entry)
  } else {
    images.push(entry)
  }
  sources.images = images
  data.sources = sources

  const out = matter.stringify(parsed.content, data)
  fs.writeFileSync(readmePath, out)
  return true
}

module.exports = { writeAttribution }
