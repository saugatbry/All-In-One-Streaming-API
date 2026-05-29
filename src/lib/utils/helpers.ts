export function fixUrl(url: string, base: string): string {
  if (!url) return ''
  if (url.startsWith('http')) return url
  if (url.startsWith('/')) return `${base.replace(/\/+$/, '')}${url}`
  return `${base.replace(/\/+$/, '/')}${url}`
}

export function fixUrlNull(url: string | undefined, base: string): string | undefined {
  if (!url) return undefined
  return fixUrl(url, base)
}

export function getBaseUrl(url: string): string {
  try {
    const u = new URL(url)
    return `${u.protocol}//${u.host}`
  } catch {
    return url
  }
}

export function getQuality(str: string): number {
  const m = str.match(/(\d{3,4})\s*[pP]/)
  return m ? parseInt(m[1]) : 0
}
