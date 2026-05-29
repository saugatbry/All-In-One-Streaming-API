import * as cheerio from 'cheerio'
import CryptoJS from 'crypto-js'
import { fetchText, getBaseUrl, fixUrl } from './fetcher'

export interface StreamResult {
  name: string
  url: string
  type: 'direct' | 'm3u8' | 'mpd' | 'extractor'
  quality?: number
  referer?: string
  headers?: Record<string, string>
}

function getQuality(str: string): number {
  const m = str.match(/(\d{3,4})\s*[pP]/)
  return m ? parseInt(m[1]) : 0
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

function aesDecrypt(encoded: string, key: string, iv: string): string {
  const ciphertext = CryptoJS.enc.Hex.parse(encoded)
  const keyParsed = CryptoJS.enc.Utf8.parse(key)
  const ivParsed = CryptoJS.enc.Utf8.parse(iv)
  const decrypted = CryptoJS.AES.decrypt(
    CryptoJS.lib.CipherParams.create({ ciphertext, key: keyParsed, iv: ivParsed }),
    keyParsed,
    { iv: ivParsed, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 }
  )
  return decrypted.toString(CryptoJS.enc.Utf8)
}

async function fetchRedirect(url: string, referer?: string): Promise<string> {
  const headers: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  }
  if (referer) headers['Referer'] = referer
  const res = await fetch(url, { method: 'GET', headers, redirect: 'manual' })
  const loc = res.headers.get('location') || ''
  return loc
}

function cleanTitle(title: string): string {
  const normalized = title
    .replace(/WEB[-_. ]?DL/gi, 'WEB-DL')
    .replace(/WEB[-_. ]?RIP/gi, 'WEBRIP')
    .replace(/H[ .]?265/gi, 'H265')
    .replace(/H[ .]?264/gi, 'H264')
    .replace(/DDP[ .]?(\d\.\d)/gi, 'DDP$1')
  const parts = normalized.split(/[\s_.]+/)
  const tags = [
    'WEB-DL', 'WEBRIP', 'BLURAY', 'HDRIP', 'DVDRIP', 'HDTV', 'CAM', 'TS',
    'BRRIP', 'BDRIP', 'H264', 'H265', 'X264', 'X265', 'HEVC', 'AVC',
    'AAC', 'AC3', 'DTS', 'MP3', 'FLAC', 'DD', 'DDP', 'EAC3', 'ATMOS',
    'SDR', 'HDR', 'HDR10', 'HDR10+', 'DV', 'DOLBYVISION',
  ]
  const found = parts.filter(p => tags.some(t => p.toUpperCase() === t || p.toUpperCase().startsWith(t)))
  return [...new Set(found)].join(' ')
}

export async function hubcloudExtract(url: string, ref?: string): Promise<StreamResult[]> {
  const results: StreamResult[] = []
  const tag = 'HubCloud'
  try {
    const baseUrl = getBaseUrl(url)
    let href = url
    if (!url.includes('hubcloud.php')) {
      const html = await fetchText(url)
      const $ = cheerio.load(html)
      const raw = $('#download').attr('href') || ''
      href = raw.startsWith('http') ? raw : `${baseUrl}/${raw.replace(/^\//, '')}`
    }
    if (!href) return results

    const html = await fetchText(href)
    const $ = cheerio.load(html)
    const size = $('#size').text() || ''
    const header = $('div.card-header').text() || ''
    const headerDetails = cleanTitle(header)
    const quality = getQuality(header)
    const labelExtras = `${headerDetails ? `[${headerDetails}]` : ''}${size ? `[${size}]` : ''}`

    $('a.btn').each((_, el) => {
      const $el = $(el)
      const link = $el.attr('href') || ''
      const text = $el.text().trim().toLowerCase()
      const namePrefix = ref || tag

      if (text.includes('fsl server')) {
        results.push({ name: `${namePrefix} [FSL Server] ${labelExtras}`, url: link, type: 'direct', quality })
      } else if (text.includes('download file')) {
        results.push({ name: `${namePrefix} ${labelExtras}`, url: link, type: 'direct', quality })
      } else if (text.includes('buzzserver')) {
        (async () => {
          try {
            const dlink = await fetchRedirect(`${link}/download`, link)
            if (dlink) results.push({ name: `${namePrefix} [BuzzServer] ${labelExtras}`, url: dlink, type: 'direct', quality })
          } catch {}
        })()
      } else if (text.includes('pixeldra') || text.includes('pixelserver') || text.includes('pixel server') || text.includes('pixeldrain')) {
        const base = getBaseUrl(link)
        const finalUrl = link.includes('download') ? link : `${base}/api/file/${link.split('/').pop()}?download`
        results.push({ name: `${namePrefix} Pixeldrain ${labelExtras}`, url: finalUrl, type: 'direct', quality })
      } else if (text.includes('s3 server')) {
        results.push({ name: `${namePrefix} [S3 Server] ${labelExtras}`, url: link, type: 'direct', quality })
      } else if (text.includes('fslv2')) {
        results.push({ name: `${namePrefix} [FSLv2] ${labelExtras}`, url: link, type: 'direct', quality })
      } else if (text.includes('mega server')) {
        results.push({ name: `${namePrefix} [Mega Server] ${labelExtras}`, url: link, type: 'direct', quality })
      }
    })
  } catch {}
  return results
}

export async function gdflixExtract(url: string, _ref?: string): Promise<StreamResult[]> {
  const results: StreamResult[] = []
  try {
    const html = await fetchText(url)
    const $ = cheerio.load(html)
    const fileName = $('ul > li.list-group-item:contains(Name)').text().split('Name :')[1]?.trim() || ''
    const fileSize = $('ul > li.list-group-item:contains(Size)').text().split('Size :')[1]?.trim() || ''
    const quality = getQuality(fileName)
    const labelExtras = `${fileName ? `[${fileName}]` : ''}${fileSize ? `[${fileSize}]` : ''}`

    const linkPromises: Promise<void>[] = []
    $('div.text-center a').each((_, el) => {
      const $el = $(el)
      const text = $el.text().trim()
      const link = $el.attr('href') || ''

      if (text.includes('DIRECT DL')) {
        results.push({ name: `GDFlix[Direct] ${labelExtras}`, url: link, type: 'direct', quality })
      } else if (text.includes('CLOUD DOWNLOAD')) {
        const decoded = decodeURIComponent(link.split('url=')[1] || '')
        results.push({ name: `GDFlix[Cloud] ${labelExtras}`, url: decoded, type: 'direct', quality })
      } else if (text.includes('pixeldra') || text.includes('pixel')) {
        const base = getBaseUrl(link)
        const finalUrl = link.includes('download') ? link : `${base}/api/file/${link.split('/').pop()}?download`
        results.push({ name: `GDFlix Pixeldrain ${labelExtras}`, url: finalUrl, type: 'direct', quality })
      } else if (text.includes('Index Links')) {
        linkPromises.push(
          (async () => {
            try {
              const subHtml = await fetchText(fixUrl(link, url))
              const $$ = cheerio.load(subHtml)
              const btnPromises: Promise<void>[] = []
              $$('a.btn.btn-outline-info').each((_, btn) => {
                const serverUrl = fixUrl($$(btn).attr('href') || '', url)
                btnPromises.push(
                  (async () => {
                    try {
                      const serverHtml = await fetchText(serverUrl)
                      const $$$ = cheerio.load(serverHtml)
                      $$$('div.mb-4 > a').each((_, src) => {
                        const source = $$$(src).attr('href') || ''
                        if (source) results.push({ name: `GDFlix[Index] ${labelExtras}`, url: source, type: 'direct', quality })
                      })
                    } catch {}
                  })()
                )
              })
              await Promise.all(btnPromises)
            } catch {}
          })()
        )
      } else if (text.includes('Instant DL')) {
        linkPromises.push(
          (async () => {
            try {
              const loc = await fetchRedirect(link)
              const parsed = loc.split('url=')[1] || loc
              if (parsed) results.push({ name: `GDFlix[Instant DL] ${labelExtras}`, url: parsed, type: 'direct', quality })
            } catch {}
          })()
        )
      } else if (text.includes('GoFile')) {
        linkPromises.push(
          (async () => {
            try {
              const goHtml = await fetchText(link)
              const $$$ = cheerio.load(goHtml)
              const gofilePromises: Promise<void>[] = []
              $$$('.row .row a').each((_, a) => {
                const glink = $$$(a).attr('href') || ''
                if (glink.includes('gofile')) {
                  gofilePromises.push(
                    (async () => {
                      const gfResults = await gofileExtract(glink)
                      results.push(...gfResults)
                    })()
                  )
                }
              })
              await Promise.all(gofilePromises)
            } catch {}
          })()
        )
      }
    })
    await Promise.all(linkPromises)
  } catch {}
  return results
}

export async function gofileExtract(url: string): Promise<StreamResult[]> {
  const results: StreamResult[] = []
  try {
    const id = url.match(/(?:\?c=|d\/)([a-zA-Z0-9-]+)/)?.[1]
    if (!id) return results

    const accountRes = await fetch('https://api.gofile.io/accounts', {
      method: 'POST',
      headers: { 'User-Agent': 'Mozilla/5.0' },
    })
    const accountJson: any = await accountRes.json()
    const token = accountJson?.data?.token
    if (!token) return results

    const globalJs = await fetchText('https://gofile.io/dist/js/global.js')
    const wt = globalJs.match(/appdata\.wt\s*=\s*['"]([^'"]+)['"]/)?.[1]
    if (!wt) return results

    const fileRes = await fetch(`https://api.gofile.io/contents/${id}?wt=${wt}`, {
      headers: { 'Authorization': `Bearer ${token}`, 'User-Agent': 'Mozilla/5.0' },
    })
    const fileJson: any = await fileRes.json()
    const children = fileJson?.data?.children
    if (!children) return results
    const firstKey = Object.keys(children)[0]
    const fileObj = children[firstKey]
    if (!fileObj) return results

    const link = fileObj.link
    const fileName = fileObj.name || ''
    const fileSize = fileObj.size || 0
    const sizeFormatted = fileSize > 1073741824
      ? `${(fileSize / 1073741824).toFixed(2)} GB`
      : `${(fileSize / 1048576).toFixed(2)} MB`
    const quality = getQuality(fileName)

    results.push({
      name: `GoFile [${sizeFormatted}]`,
      url: link,
      type: 'direct',
      quality,
      headers: { Cookie: `accountToken=${token}` },
    })
  } catch {}
  return results
}

export async function driveseedExtract(url: string, ref?: string): Promise<StreamResult[]> {
  const results: StreamResult[] = []
  try {
    const baseUrl = getBaseUrl(url)
    let docUrl = url
    let html: string

    if (url.includes('r?key=')) {
      html = await fetchText(url)
      const $0 = cheerio.load(html)
      const replacePath = $0('script').first().html()?.match(/replace\("([^"]*)"\)/)?.[1] || ''
      docUrl = `https://driveseed.org${replacePath}`
    }

    html = await fetchText(docUrl)
    const $ = cheerio.load(html)
    const qualityText = $('li.list-group-item').first().text() || ''
    const rawFileName = qualityText.replace('Name :', '').trim()
    const sizeText = ($('li:nth-child(3)').text() || '').replace('Size :', '').trim()
    const fileName = cleanTitle(rawFileName.replace(/^\d+\s*/, ''))
    const quality = getQuality(qualityText)
    const labelExtras = `${fileName ? `[${fileName}]` : ''}${sizeText ? `[${sizeText}]` : ''}`
    const namePrefix = ref || 'Driveseed'

    const linkPromises: Promise<void>[] = []
    $('div.text-center > a').each((_, el) => {
      const $el = $(el)
      const text = $el.text().trim()
      const href = $el.attr('href') || ''

      if (text.includes('Instant Download')) {
        linkPromises.push(
          (async () => {
            try {
              const loc = await fetchRedirect(href)
              const parsed = loc.split('url=')[1] || loc
              if (parsed) results.push({ name: `${namePrefix} Instant(DL) ${labelExtras}`, url: parsed, type: 'direct', quality })
            } catch {}
          })()
        )
      } else if (text.includes('Resume Worker Bot')) {
        linkPromises.push(
          (async () => {
            try {
              const res = await fetch(href, { headers: { 'User-Agent': 'Mozilla/5.0' }, redirect: 'manual' })
              const resHtml = await res.text()
              const ssid = ''
              const token = resHtml.match(/formData\.append\('token', '([a-f0-9]+)'\)/)?.[1] || ''
              const path = resHtml.match(/fetch\('\/download\?id=([a-zA-Z0-9/+]+)'/)?.[1] || ''
              if (!token || !path) return
              const downloadUrl = `${getBaseUrl(href)}/download?id=${path}`
              const postRes = await fetch(downloadUrl, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/x-www-form-urlencoded',
                  'Accept': '*/*',
                  'Origin': getBaseUrl(href),
                  'User-Agent': 'Mozilla/5.0',
                },
                body: new URLSearchParams({ token }),
              })
              const json: any = await postRes.json()
              if (json.url) results.push({ name: `${namePrefix} ResumeBot(VLC) ${labelExtras}`, url: json.url, type: 'direct', quality })
            } catch {}
          })()
        )
      } else if (text.includes('Direct Links')) {
        linkPromises.push(
          (async () => {
            try {
              const cfHtml = await fetchText(`${baseUrl}${href}?type=1`)
              const $$ = cheerio.load(cfHtml)
              $$('a.btn-success').each((_, a) => {
                const l = $$(a).attr('href') || ''
                if (l.startsWith('http')) results.push({ name: `${namePrefix} CF Type1 ${labelExtras}`, url: l, type: 'direct', quality })
              })
            } catch {}
          })()
        )
      } else if (text.includes('Resume Cloud')) {
        linkPromises.push(
          (async () => {
            try {
              const rcHtml = await fetchText(`${baseUrl}${href}`)
              const $$ = cheerio.load(rcHtml)
              const l = $$('a.btn-success').first().attr('href') || ''
              if (l.startsWith('http')) results.push({ name: `${namePrefix} ResumeCloud ${labelExtras}`, url: l, type: 'direct', quality })
            } catch {}
          })()
        )
      }
    })
    await Promise.all(linkPromises)
  } catch {}
  return results
}

export async function vidstackExtract(url: string): Promise<StreamResult[]> {
  const results: StreamResult[] = []
  try {
    const hash = url.split('#')[1]?.split('/')[1] || url.split('/').pop() || ''
    const baseUrl = getBaseUrl(url)
    const encoded = (await fetchText(`${baseUrl}/api/v1/video?id=${hash}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:134.0) Gecko/20100101 Firefox/134.0' },
    })).trim()

    const key = 'kiemtienmua911ca'
    const ivs = ['1234567890oiuytr', '0123456789abcdef']

    let decryptedText: string | null = null
    for (const iv of ivs) {
      try {
        decryptedText = aesDecrypt(encoded, key, iv)
        if (decryptedText) break
      } catch {}
    }
    if (!decryptedText) return results

    const sourceMatch = decryptedText.match(/"source"\s*:\s*"(.*?)"/)
    const m3u8 = sourceMatch?.[1]?.replace(/\\\//g, '/')
    if (m3u8) {
      results.push({
        name: 'VidStack',
        url: m3u8.replace('https', 'http'),
        type: 'm3u8',
        referer: url,
      })
    }
  } catch {}
  return results
}

export async function hubcdnExtract(url: string): Promise<StreamResult[]> {
  const results: StreamResult[] = []
  try {
    const html = await fetchText(url)
    const encoded = html.match(/r=([A-Za-z0-9+/=]+)/)?.[1]
    if (!encoded) return results
    const decoded = base64Decode(encoded)
    const m3u8 = decoded.split('link=').pop()
    if (m3u8) {
      results.push({ name: 'HUBCDN', url: m3u8, type: 'm3u8', referer: url })
    }
  } catch {}
  return results
}

export async function hubcdnReurlExtract(url: string): Promise<StreamResult[]> {
  const results: StreamResult[] = []
  try {
    const html = await fetchText(url)
    const $ = cheerio.load(html)
    const scriptText = $('script:contains(var reurl)').html() || ''
    const encodedUrl = scriptText.match(/reurl\s*=\s*"([^"]+)"/)?.[1]
    const rParam = encodedUrl?.split('?r=')[1]
    if (!rParam) return results
    const decoded = base64Decode(rParam)
    const link = decoded.split('link=').pop()
    if (link) {
      results.push({ name: 'HUBCDN(v2)', url: link, type: 'm3u8', referer: url })
    }
  } catch {}
  return results
}

export async function hubdriveExtract(url: string): Promise<StreamResult[]> {
  try {
    const html = await fetchText(url)
    const $ = cheerio.load(html)
    const href = $('.btn.btn-primary.btn-user.btn-success1.m-1').attr('href') || ''
    if (!href) return []
    if (href.includes('hubcloud')) return hubcloudExtract(href, 'HubDrive')
    return hubcloudExtract(href, 'HubDrive')
  } catch {
    return []
  }
}

export async function hblinksExtract(url: string): Promise<StreamResult[]> {
  const results: StreamResult[] = []
  try {
    const html = await fetchText(url)
    const $ = cheerio.load(html)
    const links: string[] = []
    $('h3 a, h5 a, div.entry-content p a').each((_, el) => {
      const h = $(el).attr('href') || ''
      if (h) links.push(h)
    })
    const resolved = await resolveExtractors(links)
    results.push(...resolved)
  } catch {}
  return results
}

export async function pixelDrainExtract(url: string): Promise<StreamResult[]> {
  const id = url.split('/').pop() || ''
  return [{
    name: 'PixelDrain',
    url: `https://pixeldrain.com/api/file/${id}?download`,
    type: 'direct',
  }]
}

export async function genericExtract(url: string, referer?: string): Promise<StreamResult[]> {
  const results: StreamResult[] = []
  try {
    const html = await fetchText(url, referer ? { referer } : {})
    const $ = cheerio.load(html)

    $('video > source').each((_, el) => {
      const src = $(el).attr('src')
      const type = $(el).attr('type') || ''
      if (src) {
        results.push({
          name: 'Video Source',
          url: src,
          type: type.includes('m3u8') ? 'm3u8' : 'direct',
          referer: url,
        })
      }
    })

    $('iframe[src]').each((_, el) => {
      const src = $(el).attr('src') || ''
      if (src && !src.includes('youtube') && !src.includes('google')) {
        results.push({ name: 'Embed', url: src, type: 'extractor', referer: url })
      }
    })

    const scripts = $.html()
    const m3u8Matches = scripts.matchAll(/(https?:\/\/[^"'\s]+\.m3u8[^"'\s]*)/g)
    for (const m of m3u8Matches) {
      if (!results.some(r => r.url === m[1])) {
        results.push({ name: 'M3U8', url: m[1], type: 'm3u8', referer: url })
      }
    }
  } catch {}
  return results
}

export async function hdhub4uRedirectExtract(url: string): Promise<string> {
  try {
    const doc = await fetchText(url)
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
        const body = await fetchText(`${wphttp1}?re=${data}`.trim())
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

export async function resolveExtractors(urls: string[]): Promise<StreamResult[]> {
  const results: StreamResult[] = []
  const promises = urls.map(async (url) => {
    const u = url.toLowerCase()
    try {
      if (u.includes('hubcloud')) {
        const r = await hubcloudExtract(url)
        results.push(...r)
      } else if (u.includes('gdflix')) {
        const r = await gdflixExtract(url)
        results.push(...r)
      } else if (u.includes('driveseed') || u.includes('driveleech')) {
        const r = await driveseedExtract(url)
        results.push(...r)
      } else if (u.includes('vidstack') || u.includes('hubstream')) {
        const r = await vidstackExtract(url)
        results.push(...r)
      } else if (u.includes('hubcdn') && !u.includes('reurl')) {
        const r = await hubcdnExtract(url)
        if (r.length === 0) {
          const r2 = await hubcdnReurlExtract(url)
          results.push(...r2)
        } else results.push(...r)
      } else if (u.includes('hubdrive')) {
        const r = await hubdriveExtract(url)
        results.push(...r)
      } else if (u.includes('hblinks') || u.includes('hubstreamdad')) {
        const r = await hblinksExtract(url)
        results.push(...r)
      } else if (u.includes('pixeldrain')) {
        const r = await pixelDrainExtract(url)
        results.push(...r)
      } else if (u.includes('gofile')) {
        const r = await gofileExtract(url)
        results.push(...r)
      } else if (u.endsWith('.m3u8') || u.endsWith('.m3u')) {
        results.push({ name: 'M3U8', url, type: 'm3u8' })
      } else if (u.endsWith('.mpd')) {
        results.push({ name: 'DASH', url, type: 'mpd' })
      } else {
        const r = await genericExtract(url)
        if (r.length > 0) results.push(...r)
        else results.push({ name: 'Link', url, type: 'extractor' })
      }
    } catch {
      results.push({ name: 'Link', url, type: 'extractor' })
    }
  })
  await Promise.all(promises)
  return results
}
