const DEFAULT_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36'
const TIMEOUT = 15000
const MAX_RETRIES = 2

export interface RequestOpts {
  method?: string
  headers?: Record<string, string>
  body?: string | URLSearchParams
  referer?: string
  cookies?: Record<string, string>
  timeout?: number
  retries?: number
  redirect?: 'follow' | 'manual'
}

class HttpClient {
  private jar: Record<string, Record<string, string>> = {}

  private domain(url: string): string {
    try { return new URL(url).hostname } catch { return '' }
  }

  private load(url: string): Record<string, string> {
    return this.jar[this.domain(url)] || {}
  }

  private save(url: string, setCookie: string | null) {
    if (!setCookie) return
    const d = this.domain(url)
    if (!this.jar[d]) this.jar[d] = {}
    const p = setCookie.split(';')[0]
    const i = p.indexOf('=')
    if (i > 0) this.jar[d][p.slice(0, i).trim()] = p.slice(i + 1).trim()
  }

  async fetch(url: string, opts: RequestOpts = {}): Promise<string> {
    const retries = opts.retries ?? MAX_RETRIES
    const timeout = opts.timeout ?? TIMEOUT
    const domCookies = this.load(url)

    for (let a = 0; a <= retries; a++) {
      try {
        const headers: Record<string, string> = {
          'User-Agent': DEFAULT_UA,
          ...(opts.referer ? { Referer: opts.referer } : {}),
          ...opts.headers,
        }
        const merged = { ...domCookies, ...opts.cookies }
        if (Object.keys(merged).length > 0) {
          headers['Cookie'] = Object.entries(merged).map(([k, v]) => `${k}=${v}`).join('; ')
        }
        if (opts.body instanceof URLSearchParams) {
          headers['Content-Type'] = 'application/x-www-form-urlencoded'
        }

        const ctrl = new AbortController()
        const timer = setTimeout(() => ctrl.abort(), timeout)
        const res = await fetch(url, { method: opts.method || 'GET', headers, body: opts.body as any, signal: ctrl.signal, redirect: opts.redirect || 'follow' })
        clearTimeout(timer)

        this.save(url, res.headers.get('set-cookie'))
        if (!res.ok && a < retries) continue
        return res.text()
      } catch (err: any) {
        if (a >= retries) throw new Error(`Request failed: ${err.message}`)
        await new Promise(r => setTimeout(r, 1000 * (a + 1)))
      }
    }
    throw new Error('Request failed')
  }

  get(url: string, opts?: RequestOpts) { return this.fetch(url, { ...opts, method: 'GET' }) }
  post(url: string, body: string | URLSearchParams, opts?: RequestOpts) { return this.fetch(url, { ...opts, method: 'POST', body }) }
  async json<T = any>(url: string, opts?: RequestOpts) { return JSON.parse(await this.fetch(url, { ...opts, headers: { ...opts?.headers, Accept: 'application/json' } })) as T }

  async fetchRaw(url: string, opts: RequestOpts = {}): Promise<{ body: string; headers: Headers; status: number }> {
    const retries = opts.retries ?? MAX_RETRIES
    const timeout = opts.timeout ?? TIMEOUT
    const domCookies = this.load(url)

    for (let a = 0; a <= retries; a++) {
      try {
        const headers: Record<string, string> = {
          'User-Agent': DEFAULT_UA,
          ...(opts.referer ? { Referer: opts.referer } : {}),
          ...opts.headers,
        }
        const merged = { ...domCookies, ...opts.cookies }
        if (Object.keys(merged).length > 0) {
          headers['Cookie'] = Object.entries(merged).map(([k, v]) => `${k}=${v}`).join('; ')
        }
        if (opts.body instanceof URLSearchParams) {
          headers['Content-Type'] = 'application/x-www-form-urlencoded'
        }

        const ctrl = new AbortController()
        const timer = setTimeout(() => ctrl.abort(), timeout)
        const res = await fetch(url, { method: opts.method || 'GET', headers, body: opts.body as any, signal: ctrl.signal, redirect: opts.redirect || 'follow' })
        clearTimeout(timer)

        this.save(url, res.headers.get('set-cookie'))
        return { body: await res.text(), headers: res.headers, status: res.status }
      } catch (err: any) {
        if (a >= retries) throw new Error(`Request failed: ${err.message}`)
        await new Promise(r => setTimeout(r, 1000 * (a + 1)))
      }
    }
    throw new Error('Request failed')
  }
}

export const http = new HttpClient()
