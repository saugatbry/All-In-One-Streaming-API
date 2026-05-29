import { http } from '../utils/request'

export const BASE_URL = 'https://allmovieland.one'

let sessionCookies: Record<string, string> | null = null

export async function ensureSession(forceRefresh: boolean = false): Promise<Record<string, string>> {
  if (sessionCookies && !forceRefresh) return sessionCookies

  const html = await http.get(BASE_URL)
  const phpsessid = html.match(/PHPSESSID=([^;]+)/)?.[1]
  sessionCookies = phpsessid ? { PHPSESSID: phpsessid } : {}

  return sessionCookies
}
