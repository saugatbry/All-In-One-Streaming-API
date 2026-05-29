import * as cheerio from 'cheerio'

const DEFAULT_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36'

export interface FetchOptions {
  method?: string
  headers?: Record<string, string>
  body?: string | URLSearchParams
  referer?: string
  cookies?: Record<string, string>
}

function cookieString(cookies?: Record<string, string>): string {
  if (!cookies) return ''
  return Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ')
}

export async function fetchText(url: string, opts: FetchOptions = {}): Promise<string> {
  const headers: Record<string, string> = {
    'User-Agent': DEFAULT_UA,
    ...(opts.referer ? { Referer: opts.referer } : {}),
    ...(opts.cookies ? { Cookie: cookieString(opts.cookies) } : {}),
    ...opts.headers,
  }
  if (opts.body instanceof URLSearchParams) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded'
  }
  const res = await fetch(url, {
    method: opts.method || 'GET',
    headers,
    body: opts.body,
  })
  return res.text()
}

export async function fetchDocument(url: string, opts: FetchOptions = {}): Promise<any> {
  const html = await fetchText(url, opts)
  return cheerio.load(html)
}

export async function fetchJson<T = any>(url: string, opts: FetchOptions = {}): Promise<T> {
  const text = await fetchText(url, {
    ...opts,
    headers: { ...opts.headers, Accept: 'application/json' },
  })
  return JSON.parse(text)
}

export function fixUrl(url: string, base: string): string {
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
