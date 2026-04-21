/**
 * scripts/classify_switches/frontmatter.js
 *
 * Idempotent read/write helpers for README.md YAML frontmatter.
 * Uses gray-matter so all existing fields are preserved; only the
 * fields in `patch` are updated.
 */
'use strict'

const fs = require('node:fs')
const matter = require('gray-matter')

/**
 * Read the frontmatter and markdown body from a README.md.
 *
 * @param {string} readmePath  Absolute path to README.md
 * @returns {{ data: object, content: string }}
 */
function readFrontmatter(readmePath) {
  const raw = fs.readFileSync(readmePath, 'utf-8')
  const parsed = matter(raw)
  return { data: parsed.data || {}, content: parsed.content }
}

/**
 * Patch specific frontmatter fields in a README.md.
 * All other fields (and the markdown body) are left untouched.
 * Only fields explicitly present in `patch` are written; undefined
 * values in `patch` are ignored so callers can safely spread partial objects.
 *
 * @param {string} readmePath  Absolute path to README.md
 * @param {object} patch       Fields to update (e.g. { type: 'Linear', sound: 'Silent' })
 */
function writeFrontmatterPatch(readmePath, patch) {
  const raw = fs.readFileSync(readmePath, 'utf-8')
  const parsed = matter(raw)
  const data = parsed.data || {}

  for (const [key, value] of Object.entries(patch)) {
    if (value !== undefined) {
      data[key] = value
    }
  }

  const out = matter.stringify(parsed.content, data)
  fs.writeFileSync(readmePath, out)
}

module.exports = { readFrontmatter, writeFrontmatterPatch }
