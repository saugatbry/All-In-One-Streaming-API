const DEFAULT_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36'
const REQUEST_TIMEOUT = 15000
const MAX_RETRIES = 2

interface RequestOptions {
  method?: string
  headers?: Record<string, string>
  body?: string | URLSearchParams
  referer?: string
  cookies?: Record<string, string>
  timeout?: number
  retries?: number
}

class HttpClient {
  private cookieJar: Record<string, Record<string, string>> = {}

  private getDomainCookies(url: string): Record<string, string> {
    try {
      const domain = new URL(url).hostname
      return this.cookieJar[domain] || {}
    } catch {
      return {}
    }
  }

  private setDomainCookies(url: string, setCookieHeader: string | null) {
    if (!setCookieHeader) return
    try {
      const domain = new URL(url).hostname
      if (!this.cookieJar[domain]) this.cookieJar[domain] = {}
      const parts = setCookieHeader.split(';')[0]
      const eqIdx = parts.indexOf('=')
      if (eqIdx > 0) {
        this.cookieJar[domain][parts.slice(0, eqIdx).trim()] = parts.slice(eqIdx + 1).trim()
      }
    } catch {}
  }

  async request(url: string, opts: RequestOptions = {}): Promise<string> {
    const retries = opts.retries ?? MAX_RETRIES
    const timeout = opts.timeout ?? REQUEST_TIMEOUT
    const domainCookies = this.getDomainCookies(url)

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const headers: Record<string, string> = {
          'User-Agent': DEFAULT_UA,
          ...(opts.referer ? { Referer: opts.referer } : {}),
          ...opts.headers,
        }

        const mergedCookies = { ...domainCookies, ...opts.cookies }
        if (Object.keys(mergedCookies).length > 0) {
          headers['Cookie'] = Object.entries(mergedCookies)
            .map(([k, v]) => `${k}=${v}`).join('; ')
        }

        if (opts.body instanceof URLSearchParams) {
          headers['Content-Type'] = 'application/x-www-form-urlencoded'
        }

        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), timeout)

        const res = await fetch(url, {
          method: opts.method || 'GET',
          headers,
          body: opts.body as any,
          signal: controller.signal,
          redirect: 'follow',
        })
        clearTimeout(timer)

        const setCookie = res.headers.get('set-cookie')
        if (setCookie) this.setDomainCookies(url, setCookie)

        if (!res.ok && attempt < retries) continue

        return res.text()
      } catch (err: any) {
        if (attempt >= retries) throw new Error(`Request failed after ${retries + 1} attempts: ${err.message}`)
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)))
      }
    }
    throw new Error('Request failed')
  }

  get(url: string, opts?: RequestOptions): Promise<string> {
    return this.request(url, { ...opts, method: 'GET' })
  }

  post(url: string, body: string | URLSearchParams, opts?: RequestOptions): Promise<string> {
    return this.request(url, { ...opts, method: 'POST', body })
  }

  async fetchJson<T = any>(url: string, opts?: RequestOptions): Promise<T> {
    const text = await this.request(url, {
      ...opts,
      headers: { ...opts?.headers, Accept: 'application/json' },
    })
    return JSON.parse(text)
  }
}

export const http = new HttpClient()
