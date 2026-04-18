const https = require('https')
const http = require('http')

const USER_AGENT =
  'SwitchAtlasCrawler/1.0 (+https://github.com/switchatlas/switchatlas)'

function get(urlStr, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr)
    const lib = url.protocol === 'http:' ? http : https
    const req = lib.get(
      url,
      {
        headers: { 'User-Agent': USER_AGENT, ...(options.headers || {}) },
        timeout: options.timeout || 30000,
      },
      (res) => {
        // Follow one level of redirect
        if (
          [301, 302, 303, 307, 308].includes(res.statusCode) &&
          res.headers.location &&
          (options._redirects || 0) < 3
        ) {
          res.resume()
          const next = new URL(res.headers.location, url).toString()
          resolve(get(next, { ...options, _redirects: (options._redirects || 0) + 1 }))
          return
        }
        resolve(res)
      },
    )
    req.on('error', reject)
    req.on('timeout', () => {
      req.destroy(new Error(`Timeout fetching ${urlStr}`))
    })
  })
}

async function getJson(urlStr, options) {
  const res = await get(urlStr, options)
  if (res.statusCode !== 200) {
    res.resume()
    throw new Error(`HTTP ${res.statusCode} for ${urlStr}`)
  }
  let data = ''
  res.setEncoding('utf8')
  for await (const chunk of res) data += chunk
  return JSON.parse(data)
}

async function getText(urlStr, options) {
  const res = await get(urlStr, options)
  if (res.statusCode !== 200) {
    res.resume()
    return { status: res.statusCode, text: '' }
  }
  let data = ''
  res.setEncoding('utf8')
  for await (const chunk of res) data += chunk
  return { status: 200, text: data }
}

module.exports = { get, getJson, getText, USER_AGENT }
