interface Entry<T> { data: T; expires: number }

export class Cache {
  private store = new Map<string, Entry<any>>()
  private ttl: number

  constructor(ttlMs = 300_000) {
    this.ttl = ttlMs
    setInterval(() => {
      const now = Date.now()
      for (const [k, v] of this.store) { if (now > v.expires) this.store.delete(k) }
    }, 60_000)
  }

  get<T>(key: string): T | undefined {
    const e = this.store.get(key)
    if (!e) return
    if (Date.now() > e.expires) { this.store.delete(key); return }
    return e.data as T
  }

  set<T>(key: string, data: T, ttl?: number) {
    this.store.set(key, { data, expires: Date.now() + (ttl ?? this.ttl) })
  }

  clear() { this.store.clear() }
}

export const cache = new Cache()
