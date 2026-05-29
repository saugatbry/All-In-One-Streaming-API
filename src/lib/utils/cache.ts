interface CacheEntry<T> {
  data: T
  expiresAt: number
}

export class TtlCache {
  private store = new Map<string, CacheEntry<any>>()
  private defaultTtl: number

  constructor(ttlMs: number = 5 * 60 * 1000) {
    this.defaultTtl = ttlMs
    this.startCleanup()
  }

  get<T>(key: string): T | undefined {
    const entry = this.store.get(key)
    if (!entry) return undefined
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key)
      return undefined
    }
    return entry.data as T
  }

  set<T>(key: string, data: T, ttlMs?: number): void {
    this.store.set(key, {
      data,
      expiresAt: Date.now() + (ttlMs ?? this.defaultTtl),
    })
  }

  private startCleanup(): void {
    setInterval(() => {
      const now = Date.now()
      for (const [key, entry] of this.store.entries()) {
        if (now > entry.expiresAt) this.store.delete(key)
      }
    }, 60_000)
  }
}

export const cache = new TtlCache()
