export function fixUrl(url: string, base: string): string {
  if (!url) return ''
  if (url.startsWith('http')) return url
  if (url.startsWith('/')) return `${base.replace(/\/+$/, '')}${url}`
  return `${base.replace(/\/+$/, '/')}${url}`
}

export function fixUrlNull(url: string | undefined, base: string): string | undefined {
  return url ? fixUrl(url, base) : undefined
}

export function getBaseUrl(url: string): string {
  try { const u = new URL(url); return `${u.protocol}//${u.host}` } catch { return url }
}

export function getQuality(str: string): number {
  const m = str.match(/(\d{3,4})\s*[pP]/)
  return m ? parseInt(m[1]) : 0
}

export function base64Decode(str: string): string {
  return Buffer.from(str, 'base64').toString('utf-8')
}

export function b64(str: string): string {
  return Buffer.from(str, 'utf-8').toString('base64')
}

export const ub64 = base64Decode

export function rot13(str: string): string {
  return str.replace(/[a-zA-Z]/g, c => {
    const code = c.charCodeAt(0)
    if (code >= 65 && code <= 90) return String.fromCharCode(((code - 65 + 13) % 26) + 65)
    if (code >= 97 && code <= 122) return String.fromCharCode(((code - 97 + 13) % 26) + 97)
    return c
  })
}

export function cleanTitle(title: string): string {
  const n = title.replace(/WEB[-_. ]?DL/gi, 'WEB-DL').replace(/WEB[-_. ]?RIP/gi, 'WEBRIP').replace(/H[ .]?265/gi, 'H265').replace(/H[ .]?264/gi, 'H264')
  const parts = n.split(/[\s_.]+/)
  const tags = ['WEB-DL','WEBRIP','BLURAY','HDRIP','DVDRIP','HDTV','CAM','TS','BRRIP','BDRIP','H264','H265','X264','X265','HEVC','AVC','AAC','AC3','DTS','MP3','FLAC','DD','DDP','EAC3','ATMOS','SDR','HDR','HDR10','HDR10+','DV','DOLBYVISION']
  const found = parts.filter(p => tags.some(t => p.toUpperCase() === t || p.toUpperCase().startsWith(t)))
  return [...new Set(found)].join(' ')
}
