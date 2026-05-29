import * as cheerio from 'cheerio'
import { http } from '@/core/utils/request'

export interface ExtractorResult {
  name?: string
  url: string
  type: string
  quality?: number
  referer?: string
  headers?: Record<string, string>
}

function getBaseUrl(url: string): string {
  try { const u = new URL(url); return `${u.protocol}//${u.host}` } catch { return '' }
}

function getIndexQuality(str: string): number {
  const m = str.match(/(\d{3,4})\s*[pP]/)
  return m ? parseInt(m[1]) : 0
}

function cleanTitle(title: string): string {
  const name = title.replace(/\.[a-zA-Z0-9]{2,4}$/, '')
  const normalized = name
    .replace(/WEB[-_. ]?DL/gi, 'WEB-DL')
    .replace(/WEB[-_. ]?RIP/gi, 'WEBRIP')
    .replace(/H[ .]?265/gi, 'H265')
    .replace(/H[ .]?264/gi, 'H264')
    .replace(/DDP[ .]?(\d\.\d)/gi, 'DDP$1')

  const parts = normalized.split(/[\s_.]+/)
  const sourceTags = new Set(['WEB-DL','WEBRIP','BLURAY','HDRIP','DVDRIP','HDTV','CAM','TS','BRRIP','BDRIP'])
  const codecTags = new Set(['H264','H265','X264','X265','HEVC','AVC'])
  const audioTags = new Set(['AAC','AC3','DTS','MP3','FLAC','DD','DDP','EAC3'])
  const hdrTags = new Set(['SDR','HDR','HDR10','HDR10+','DV','DOLBYVISION'])

  const filtered = parts.map(p => {
    const u = p.toUpperCase()
    if (sourceTags.has(u)) return u
    if (codecTags.has(u)) return u
    if ([...audioTags].some(t => u.startsWith(t))) return u
    if (u === 'ATMOS') return u
    if (hdrTags.has(u)) return u === 'DV' || u === 'DOLBYVISION' ? 'DOLBYVISION' : u
    if (u === 'NF' || u === 'CR') return u
    return null
  }).filter(Boolean) as string[]

  return [...new Set(filtered)].join(' ')
}

// ---------- HUB-CLOUD (used by animedubhindi + hdhub4u) ----------
export async function hubcloudExtract(url: string, ref: string = ''): Promise<ExtractorResult[]> {
  const results: ExtractorResult[] = []
  const tag = 'HubCloud'
  const uri = (() => { try { return new URL(url) } catch { return null } })()
  if (!uri) return results

  const realUrl = uri.toString()
  const baseUrl = `${uri.protocol}//${uri.host}`

  let href = ''
  try {
    if (url.includes('hubcloud.php')) {
      href = realUrl
    } else {
      const html = await http.get(realUrl, { timeout: 10000 })
      const $ = cheerio.load(html)
      const raw = $('#download').attr('href') || ''
      href = raw.startsWith('http') ? raw : baseUrl.replace(/\/+$/, '') + '/' + raw.replace(/^\/+/, '')
    }
  } catch { return results }

  if (!href) return results

  let html2: string
  try { html2 = await http.get(href, { timeout: 10000 }) } catch { return results }
  const $ = cheerio.load(html2)
  const size = $('#size').text() || ''
  const header = $('div.card-header').text() || ''
  const headerDetails = cleanTitle(header)
  const quality = getIndexQuality(header)
  const labelExtras = (headerDetails ? `[${headerDetails}]` : '') + (size ? `[${size}]` : '')

  $('a.btn').each((_, el) => {
    const link = $(el).attr('href') || ''
    const text = $(el).text() || ''
    const label = text.toLowerCase()

    if (label.includes('fsl server')) {
      results.push({ name: `${ref}[FSL Server] ${labelExtras}`.trim(), url: link, type: 'direct', quality, headers: { Referer: baseUrl } })
    } else if (label.includes('download file')) {
      results.push({ name: `${ref} ${labelExtras}`.trim(), url: link, type: 'direct', quality, headers: { Referer: baseUrl } })
    } else if (label.includes('buzzserver')) {
      results.push({ name: `${ref}[BuzzServer] ${labelExtras}`.trim(), url: `${link}/download`, type: 'direct', quality, headers: { Referer: link } })
    } else if (label.includes('pixeldra') || label.includes('pixelserver') || label.includes('pixel server') || label.includes('pixeldrain')) {
      const b = getBaseUrl(link)
      const finalUrl = link.includes('download') ? link : `${b}/api/file/${link.split('/').pop()}?download`
      results.push({ name: `${ref}Pixeldrain ${labelExtras}`.trim(), url: finalUrl, type: 'direct', quality })
    } else if (label.includes('s3 server')) {
      results.push({ name: `${ref}[S3 Server] ${labelExtras}`.trim(), url: link, type: 'direct', quality })
    } else if (label.includes('fslv2')) {
      results.push({ name: `${ref}[FSLv2] ${labelExtras}`.trim(), url: link, type: 'direct', quality })
    } else if (label.includes('mega server')) {
      results.push({ name: `${ref}[Mega Server] ${labelExtras}`.trim(), url: link, type: 'direct', quality })
    }
  })

  return results
}

// ---------- GDFLIX (used by animedubhindi) ----------
async function getGdflixLatestUrl(): Promise<string> {
  try {
    const text = await http.get('https://raw.githubusercontent.com/SaurabhKaperwan/Utils/refs/heads/main/urls.json')
    const json = JSON.parse(text)
    return json.gdflix || 'https://gdflix.*'
  } catch { return 'https://gdflix.*' }
}

export async function gdflixExtract(url: string): Promise<ExtractorResult[]> {
  const results: ExtractorResult[] = []
  const latestUrl = await getGdflixLatestUrl()
  const newUrl = url.replace('https://*.gdflix.*', latestUrl).replace('https://gdflix.*', latestUrl)

  let html: string
  try { html = await http.get(newUrl, { timeout: 10000 }) } catch { return results }
  const $ = cheerio.load(html)

  const fileName = $('ul > li.list-group-item:contains(Name)').text().split('Name :')[1]?.trim() || ''
  const fileSize = $('ul > li.list-group-item:contains(Size)').text().split('Size :')[1]?.trim() || ''
  const quality = getIndexQuality(fileName)

  const promises: Promise<void>[] = []

  $('div.text-center a').each((_, anchor) => {
    const text = $(anchor).text()
    const link = $(anchor).attr('href') || ''

    if (text.includes('DIRECT DL')) {
      results.push({ name: `GDFlix[Direct] ${fileName}[${fileSize}]`, url: link, type: 'direct', quality })
    } else if (text.includes('CLOUD DOWNLOAD [R2]')) {
      const decoded = decodeURIComponent(link.split('url=')[1] || '')
      results.push({ name: `GDFlix[Cloud] ${fileName}[${fileSize}]`, url: decoded, type: 'direct', quality })
    } else if (text.toLowerCase().includes('pixeldra') || text.toLowerCase().includes('pixel')) {
      const b = getBaseUrl(link)
      const finalUrl = link.includes('download') ? link : `${b}/api/file/${link.split('/').pop()}?download`
      results.push({ name: `GDFlix Pixeldrain ${fileName}[${fileSize}]`, url: finalUrl, type: 'direct', quality })
    } else if (text.includes('Index Links')) {
      promises.push((async () => {
        try {
          const idxHtml = await http.get(`${latestUrl}${link}`, { timeout: 8000 })
          const $idx = cheerio.load(idxHtml)
          const btnPromises: Promise<void>[] = []
          $idx('a.btn.btn-outline-info').each((_, btn) => {
            const serverUrl = latestUrl + $idx(btn).attr('href')
            btnPromises.push((async () => {
              try {
                const srvHtml = await http.get(serverUrl, { timeout: 8000 })
                const $srv = cheerio.load(srvHtml)
                $srv('div.mb-4 > a').each((_, srcAnchor) => {
                  const src = $srv(srcAnchor).attr('href') || ''
                  if (src) results.push({ name: `GDFlix[Index] ${fileName}[${fileSize}]`, url: src, type: 'direct', quality })
                })
              } catch {}
            })())
          })
          await Promise.all(btnPromises)
        } catch {}
      })())
    } else if (text.includes('DRIVEBOT')) {
      promises.push((async () => {
        try {
          const driveLink = link
          const id = driveLink.split('id=')[1]?.split('&')[0] || ''
          const doId = driveLink.split('do=')[1]?.split('==')[0] || ''
          const baseUrls = ['https://drivebot.sbs', 'https://indexbot.site']
          for (const baseUrl of baseUrls) {
            try {
              const indexbotLink = `${baseUrl}/download?id=${id}&do=${doId}`
              const indexRes = await http.get(indexbotLink, { timeout: 5000 })
              const $ib = cheerio.load(indexRes)
              const tokenMatch = indexRes.match(/formData\.append\('token',\s*'([a-f0-9]+)'\)/)
              const postIdMatch = indexRes.match(/fetch\('\/download\?id=([a-zA-Z0-9/+]+)'/)
              if (tokenMatch && postIdMatch) {
                const token = tokenMatch[1]
                const postId = postIdMatch[1]
                const formBody = new URLSearchParams({ token }).toString()
                const postRes = await http.post(`${baseUrl}/download?id=${postId}`, formBody, {
                  headers: { Referer: indexbotLink, 'Content-Type': 'application/x-www-form-urlencoded' },
                })
                const urlMatch = postRes.match(/url":"(.*?)"/)
                if (urlMatch) {
                  const dlUrl = urlMatch[1].replace(/\\/g, '')
                  results.push({ name: `GDFlix[DriveBot] ${fileName}[${fileSize}]`, url: dlUrl, type: 'direct', quality, referer: baseUrl })
                }
              }
            } catch {}
          }
        } catch {}
      })())
    } else if (text.includes('Instant DL')) {
      promises.push((async () => {
        try {
          const instRes = await http.fetchRaw(link, { timeout: 5000, redirect: 'manual' })
          const loc = instRes.headers.get('location') || ''
          const decoded = loc.split('url=')[1] || ''
          if (decoded) results.push({ name: `GDFlix[Instant Download] ${fileName}[${fileSize}]`, url: decoded, type: 'direct', quality })
        } catch {}
      })())
    } else if (text.includes('GoFile')) {
      promises.push((async () => {
        try {
          const goHtml = await http.get(link, { timeout: 8000 })
          const $go = cheerio.load(goHtml)
          const gofilePromises: Promise<void>[] = []
          $go('.row .row a').each((_, goAnchor) => {
            const goLink = $(goAnchor).attr('href') || ''
            if (goLink.includes('gofile')) {
              gofilePromises.push((async () => {
                try { const r = await gofileExtract(goLink); results.push(...r) } catch {}
              })())
            }
          })
          await Promise.all(gofilePromises)
        } catch {}
      })())
    }
  })

  await Promise.all(promises)
  return results
}

// ---------- GOFILE ----------
export async function gofileExtract(url: string): Promise<ExtractorResult[]> {
  const results: ExtractorResult[] = []
  const mainApi = 'https://api.gofile.io'
  try {
    const idMatch = url.match(/\/(?:\?c=|d\/)([a-zA-Z0-9-]+)/)
    if (!idMatch) return results
    const id = idMatch[1]

    const acctRes = await http.post(`${mainApi}/accounts`, '', { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } })
    const acctJson = JSON.parse(acctRes)
    const token = acctJson?.data?.token
    if (!token) return results

    const globalJs = await http.get('https://gofile.io/dist/js/global.js')
    const wtMatch = globalJs.match(/appdata\.wt\s*=\s*["']([^"']+)["']/)
    if (!wtMatch) return results
    const wt = wtMatch[1]

    const contentsRes = await http.get(`${mainApi}/contents/${id}?wt=${wt}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const contentsJson = JSON.parse(contentsRes)
    const data = contentsJson?.data
    if (!data?.children) return results
    const keys = Object.keys(data.children)
    if (!keys.length) return results
    const file = data.children[keys[0]]
    const fileUrl = file?.link
    const fileName = file?.name || ''
    const fileSize = file?.size || 0
    const sizeFormatted = fileSize < 1073741824
      ? `${(fileSize / 1048576).toFixed(2)} MB`
      : `${(fileSize / 1073741824).toFixed(2)} GB`
    if (fileUrl) {
      results.push({ name: `Gofile [${sizeFormatted}]`, url: fileUrl, type: 'direct', quality: getIndexQuality(fileName), headers: { Cookie: `accountToken=${token}` } })
    }
  } catch {}
  return results
}

// ---------- VIDSTACK (AES-128-CBC) used by hdhub4u ----------
import crypto from 'crypto'

function decryptAES(inputHex: string, key: string, iv: string): string {
  const decipher = crypto.createDecipheriv('aes-128-cbc', Buffer.from(key, 'utf-8'), Buffer.from(iv, 'utf-8'))
  let decrypted = decipher.update(inputHex, 'hex', 'utf-8')
  decrypted += decipher.final('utf-8')
  return decrypted
}

export async function vidstackExtract(url: string): Promise<ExtractorResult[]> {
  const results: ExtractorResult[] = []
  try {
    const baseUrl = getBaseUrl(url)
    const hash = url.split('#').pop()?.split('/').pop() || ''
    if (!hash) return results

    const encoded = await http.get(`${baseUrl}/api/v1/video?id=${hash}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:134.0) Gecko/20100101 Firefox/134.0' },
    })
    const key = 'kiemtienmua911ca'
    const ivList = ['1234567890oiuytr', '0123456789abcdef']
    let m3u8 = ''
    for (const iv of ivList) {
      try {
        const decrypted = decryptAES(encoded.trim(), key, iv)
        const srcMatch = decrypted.match(/"source":"(.*?)"/)
        if (srcMatch) { m3u8 = srcMatch[1].replace(/\\\//g, '/'); break }
      } catch {}
    }
    if (m3u8) {
      results.push({ name: 'Vidstack', url: m3u8.replace('https', 'http'), type: 'm3u8', referer: url,
        headers: { Referer: url, Origin: url.split('/').slice(0, 3).join('/') } })
    }
  } catch {}
  return results
}

// ---------- HUBCDN (base64 decode chain) used by hdhub4u ----------
export async function hubcdnExtract(url: string): Promise<ExtractorResult[]> {
  const results: ExtractorResult[] = []
  try {
    const html = await http.get(url, { timeout: 10000 })
    const $ = cheerio.load(html)
    const scriptText = $('script:containsData(var reurl)').html() || ''
    const reurlMatch = scriptText.match(/reurl\s*=\s*"([^"]+)"/)
    if (!reurlMatch) return results
    const encodedUrl = reurlMatch[1].split('?r=')[1] || ''
    const decodedUrl = Buffer.from(encodedUrl, 'base64').toString('utf-8').split('link=').pop() || ''
    if (decodedUrl) {
      results.push({ name: 'HUBCDN', url: decodedUrl, type: 'direct' })
    }
  } catch {}
  return results
}

// ---------- HBLINKS ----------
export async function hblinksExtract(url: string): Promise<ExtractorResult[]> {
  const results: ExtractorResult[] = []
  try {
    const html = await http.get(url, { timeout: 10000 })
    const $ = cheerio.load(html)
    const promises: Promise<void>[] = []
    $('h3 a, h5 a, div.entry-content p a').each((_, el) => {
      const href = $(el).attr('href') || ''
      const lower = href.toLowerCase()
      promises.push((async () => {
        try {
          if (lower.includes('hubdrive')) { const r = await hubdriveExtract(href); results.push(...r) }
          else if (lower.includes('hubcloud')) { const r = await hubcloudExtract(href); results.push(...r) }
          else if (lower.includes('hubcdn')) { const r = await hubcdnExtract(href); results.push(...r) }
        } catch {}
      })())
    })
    await Promise.all(promises)
  } catch {}
  return results
}

// ---------- HUBDRIVE ----------
export async function hubdriveExtract(url: string): Promise<ExtractorResult[]> {
  try {
    const html = await http.get(url, { timeout: 5000 })
    const $ = cheerio.load(html)
    const href = $('.btn.btn-primary.btn-user.btn-success1.m-1').attr('href') || ''
    if (href.toLowerCase().includes('hubcloud')) return await hubcloudExtract(href)
    return []
  } catch { return [] }
}

// ---------- HDHUB4U REDIRECT BYPASS ----------
function pen(value: string): string {
  return value.split('').map(ch => {
    const code = ch.charCodeAt(0)
    if (ch >= 'A' && ch <= 'Z') return String.fromCharCode(((code - 65 + 13) % 26) + 65)
    if (ch >= 'a' && ch <= 'z') return String.fromCharCode(((code - 97 + 13) % 26) + 97)
    return ch
  }).join('')
}

export async function hdhub4uRedirect(url: string): Promise<string | null> {
  try {
    const doc = await http.get(url, { timeout: 10000 })
    const regex = /s\('o','([A-Za-z0-9+/=]+)'|ck\('_wp_http_\d+','([^']+)'/g
    let combined = ''
    let m: RegExpExecArray | null
    while ((m = regex.exec(doc)) !== null) {
      combined += m[1] || m[2] || ''
    }
    if (!combined) return url
    const decoded1 = Buffer.from(combined, 'base64').toString('utf-8')
    const decoded2 = Buffer.from(decoded1, 'base64').toString('utf-8')
    const decoded3 = pen(decoded2)
    const decoded4 = Buffer.from(decoded3, 'base64').toString('utf-8')
    const json = JSON.parse(decoded4)
    const encodedUrl = Buffer.from(json.o || '', 'base64').toString('utf-8').trim()
    const data = json.data || ''
    const blogUrl = json.blog_url || ''
    if (encodedUrl) return encodedUrl
    if (blogUrl && data) {
      const directRes = await http.get(`${blogUrl}?re=${data}`, { timeout: 10000 })
      const $ = cheerio.load(directRes)
      return $('body').text().trim() || url
    }
    return url
  } catch { return url }
}

// ---------- GDMIRRORBOT (used by animedekho) ----------
export async function gdmirrorbotExtract(url: string): Promise<ExtractorResult[]> {
  const results: ExtractorResult[] = []
  try {
    const mainUrl = 'https://gdmirrorbot.nl'
    const hasKey = url.includes('key=')
    let sid: string
    let host: string

    if (!hasKey) {
      sid = url.split('embed/')[1] || ''
      const pageHtml = await http.get(url, { timeout: 10000 })
      host = getBaseUrl(pageHtml)
    } else {
      const pageHtml = await http.get(url, { timeout: 10000 })
      const finalId = pageHtml.match(/FinalID\s*=\s*"([^"]+)"/)?.[1]
      const myKey = pageHtml.match(/myKey\s*=\s*"([^"]+)"/)?.[1]
      const idType = pageHtml.match(/idType\s*=\s*"([^"]+)"/)?.[1] || 'imdbid'
      const baseUrlMatch = pageHtml.match(/let\s+baseUrl\s*=\s*"([^"]+)"/)?.[1]
      host = baseUrlMatch ? getBaseUrl(baseUrlMatch) : mainUrl

      if (finalId && myKey) {
        const apiUrl = url.includes('/tv/')
          ? `${mainUrl}/myseriesapi?tmdbid=${finalId}&season=${url.match(/\/tv\/\d+\/(\d+)\//)?.[1] || '1'}&epname=${url.match(/\/tv\/\d+\/\d+\/(\d+)/)?.[1] || '1'}&key=${myKey}`
          : `${mainUrl}/mymovieapi?${idType}=${finalId}&key=${myKey}`
        const apiRes = await http.get(apiUrl, { timeout: 10000 })
        const apiJson = JSON.parse(apiRes)
        const embedId = url.split('/').pop() || ''
        sid = apiJson?.data?.[0]?.fileslug || embedId
      } else {
        return results
      }
    }

    if (!sid || !host) return results

    const postRes = await http.post(`${host}/embedhelper.php`, new URLSearchParams({ sid }).toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
    const root = JSON.parse(postRes)
    const siteUrls = root.siteUrls
    const siteFriendlyNames = root.siteFriendlyNames
    let mresult: Record<string, string> = {}
    if (root.mresult && typeof root.mresult === 'object' && !Array.isArray(root.mresult)) {
      mresult = root.mresult
    } else if (typeof root.mresult === 'string') {
      mresult = JSON.parse(Buffer.from(root.mresult, 'base64').toString('utf-8'))
    }

    for (const key of Object.keys(siteUrls)) {
      if (!(key in mresult)) continue
      const base = (siteUrls[key] as string).replace(/\/+$/, '')
      const path = (mresult[key] as string).replace(/^\/+/, '')
      const fullUrl = `${base}/${path}`
      const friendlyName = siteFriendlyNames?.[key] || key

      results.push({ name: friendlyName, url: fullUrl, type: 'direct', referer: mainUrl })
    }
  } catch {}
  return results
}

// ---------- GENERIC IFRAME/VIDEO EXTRACTOR ----------
export async function genericExtract(url: string, referer: string = ''): Promise<ExtractorResult[]> {
  const results: ExtractorResult[] = []
  try {
    const html = await http.get(url, { headers: { Referer: referer }, timeout: 10000 })
    const $ = cheerio.load(html)

    // Look for video tags
    $('video source[src]').each((_, el) => {
      const src = $(el).attr('src') || ''
      if (src) results.push({ name: 'Video', url: src, type: src.endsWith('.m3u8') ? 'm3u8' : 'mp4' })
    })
    $('video[src]').each((_, el) => {
      const src = $(el).attr('src') || ''
      if (src) results.push({ name: 'Video', url: src, type: src.endsWith('.m3u8') ? 'm3u8' : 'mp4' })
    })

    // Look for iframes
    $('iframe[src]').each((_, el) => {
      const src = $(el).attr('src') || ''
      if (src && !src.includes('youtube') && !src.includes('youtu.be')) {
        results.push({ name: 'Iframe', url: src, type: 'direct' })
      }
    })

    // Look for direct M3U8 in text
    const text = html
    const m3u8Regex = /https?:\/\/[^\s"']+\.m3u8[^\s"'\]*["']?/g
    let match
    while ((match = m3u8Regex.exec(text)) !== null) {
      const m3u8Url = match[0].replace(/["']$/, '')
      if (!results.some(r => r.url === m3u8Url)) {
        results.push({ name: 'M3U8', url: m3u8Url, type: 'm3u8' })
      }
    }
  } catch {}
  return results
}

// ---------- MASTER ROUTER ----------
export async function resolveExtractors(urls: string[]): Promise<ExtractorResult[]> {
  const allResults: ExtractorResult[] = []
  const seenUrls = new Set<string>()

  for (const url of urls) {
    if (seenUrls.has(url)) continue
    seenUrls.add(url)
    let results: ExtractorResult[] = []
    try {
      if (url.includes('hubcloud')) results = await hubcloudExtract(url)
      else if (url.includes('gdflix')) results = await gdflixExtract(url)
      else if (url.includes('gofile')) results = await gofileExtract(url)
      else if (url.includes('vidstack') || url.includes('hubstream')) results = await vidstackExtract(url)
      else if (url.includes('hubcdn')) results = await hubcdnExtract(url)
      else if (url.includes('hblinks')) results = await hblinksExtract(url)
      else if (url.includes('hubdrive')) results = await hubdriveExtract(url)
      else if (url.includes('gdmirrorbot') || url.includes('techinmind')) results = await gdmirrorbotExtract(url)
      else results = await genericExtract(url)

      for (const r of results) {
        if (!seenUrls.has(r.url)) {
          seenUrls.add(r.url)
          allResults.push(r)
        }
      }
    } catch {}
  }
  return allResults
}
