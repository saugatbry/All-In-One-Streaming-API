import * as cheerio from 'cheerio'
import { http } from '../utils/request'
import { getBaseUrl } from '../utils/helpers'

interface BypassResult {
  url: string
  headers?: Record<string, string>
}

function base64Decode(str: string): string {
  return Buffer.from(str, 'base64').toString('utf-8')
}

function rot13(str: string): string {
  return str.replace(/[a-zA-Z]/g, (c) => {
    const code = c.charCodeAt(0)
    if (code >= 65 && code <= 90) return String.fromCharCode(((code - 65 + 13) % 26) + 65)
    if (code >= 97 && code <= 122) return String.fromCharCode(((code - 97 + 13) % 26) + 97)
    return c
  })
}

export async function hdhub4uRedirect(url: string): Promise<string> {
  try {
    const doc = await http.get(url)
    const regex = /s\('o','([A-Za-z0-9+/=]+)'|ck\('_wp_http_\d+','([^']+)'\)/g
    let combined = ''
    let match
    while ((match = regex.exec(doc)) !== null) {
      combined += match[1] || match[2] || ''
    }
    if (!combined) return url

    const decodedString = base64Decode(rot13(base64Decode(base64Decode(combined))))
    const json = JSON.parse(decodedString)
    const wphttp1 = json.blog_url || ''
    const encodedurl = base64Decode(json.o || '').trim()
    const data = base64Decode(json.data || '').trim()

    if (data && wphttp1) {
      try {
        const body = await http.get(`${wphttp1}?re=${data}`.trim())
        const directLink = cheerio.load(body).text().trim()
        return directLink || encodedurl || url
      } catch {
        return encodedurl || url
      }
    }
    return encodedurl || url
  } catch {
    return url
  }
}

export async function bypassHrefli(url: string): Promise<BypassResult> {
  try {
    const html = await http.get(url)
    const $ = cheerio.load(html)

    const formAction = $('form').attr('action') || ''
    const inputs: Record<string, string> = {}
    $('form input').each((_, el) => {
      const name = $(el).attr('name')
      const value = $(el).attr('value') || ''
      if (name) inputs[name] = value
    })

    if (formAction && Object.keys(inputs).length > 0) {
      const postUrl = formAction.startsWith('http') ? formAction : getBaseUrl(url) + formAction
      const body = new URLSearchParams(inputs)
      const res = await http.post(postUrl, body, { referer: url })
      const redirectMatch = res.match(/window\.location\.href\s*=\s*['"]([^'"]+)['"]/)
      if (redirectMatch) {
        return { url: redirectMatch[1], headers: { Referer: postUrl } }
      }
    }

    const iframeSrc = $('iframe').attr('src')
    if (iframeSrc) return { url: iframeSrc }

    return { url }
  } catch {
    return { url }
  }
}
