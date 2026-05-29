import { http } from '@/core/utils/request'

const DOMAINS_URL = 'https://raw.githubusercontent.com/phisher98/TVVVV/refs/heads/main/domains.json'
const DEFAULT_MAIN = 'https://hdhub4u.rehab'
const DEFAULT_HUBCLOUD = 'https://hubcloud.foo'

let cachedDomains: { HDHUB4u?: string; hubcloud?: string } | null = null

export async function getDomainUrl(): Promise<string> {
  if (!cachedDomains) {
    try {
      cachedDomains = JSON.parse(await http.get(DOMAINS_URL, { timeout: 5000 }))
    } catch {
      cachedDomains = {}
    }
  }
  return cachedDomains?.HDHUB4u || DEFAULT_MAIN
}

export async function getHubcloudDomain(): Promise<string> {
  if (!cachedDomains) {
    try {
      cachedDomains = JSON.parse(await http.get(DOMAINS_URL, { timeout: 5000 }))
    } catch {
      cachedDomains = {}
    }
  }
  return cachedDomains?.hubcloud || DEFAULT_HUBCLOUD
}

export function getBaseHeaders(): Record<string, string> {
  return {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0',
    'Cookie': 'xla=s4t',
  }
}

export { DEFAULT_MAIN, DEFAULT_HUBCLOUD }
