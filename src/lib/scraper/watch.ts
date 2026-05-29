import { http } from '../utils/request'
import { StreamResult } from '../types'
import { BASE_URL } from './session'

interface Extract {
  title?: string; id?: string; file?: string
}

interface StreamPayload {
  playerDomain: string; tokenKey: string; items?: Extract[]; links?: Extract[]; raw?: string
}

async function getM3u8(playerDomain: string, tokenKey: string, file: string): Promise<string> {
  return http.get(`${playerDomain}/playlist/${file}.txt`, {
    headers: { 'X-CSRF-TOKEN': tokenKey },
    referer: `${BASE_URL}/`,
  })
}

export async function getWatch(data: any): Promise<StreamResult[]> {
  const payload: StreamPayload | null =
    (data?.streamData?.playerDomain ? data.streamData : null) ||
    (data?.playerDomain ? data : null)

  if (!payload?.playerDomain || !payload?.tokenKey) {
    const urls = extractUrls(data)
    if (urls.length > 0) {
      const { resolveExtractors } = await import('../extractors')
      return resolveExtractors(urls)
    }
    throw new Error('No stream data available')
  }

  const results: StreamResult[] = []
  const links = payload.items || payload.links || []

  for (const item of links) {
    try {
      const m3u8Content = await getM3u8(payload.playerDomain, payload.tokenKey, item.file!)
      const urls = m3u8Content.match(/https?:\/\/[^\s]+/g) || []
      urls.forEach((u: string) => {
        results.push({
          name: `AllMovieLand`,
          url: u,
          type: 'm3u8',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            Referer: payload.playerDomain,
            Origin: payload.playerDomain,
          },
        })
      })
    } catch {}
  }

  return results
}

function extractUrls(data: any): string[] {
  if (Array.isArray(data)) return data.filter(Boolean)
  if (typeof data === 'string') return [data]
  if (data?.streamData) {
    if (Array.isArray(data.streamData)) return data.streamData.map((s: any) => typeof s === 'string' ? s : s.url).filter(Boolean)
    if (typeof data.streamData === 'string') return [data.streamData]
  }
  return []
}
