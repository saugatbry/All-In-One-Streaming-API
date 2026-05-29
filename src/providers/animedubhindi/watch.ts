import { WatchResponse, StreamSource } from '@/core/types'
import { resolveExtractors } from '@/core/extractors'
import { ub64 } from '@/core/utils/helpers'

export async function watch(providerName: string, type: string, episodeId: string): Promise<WatchResponse> {
  let links: { name: string; url: string }[]
  try { links = JSON.parse(ub64(episodeId)) } catch {
    return { status: 'error', provider: providerName, type: type as any, streams: [], subtitles: [], error: 'Invalid episode data' }
  }
  if (!links?.length) {
    return { status: 'error', provider: providerName, type: type as any, streams: [], subtitles: [], error: 'No stream data' }
  }

  const streams: StreamSource[] = []
  const seenUrls = new Set<string>()

  for (const item of links) {
    if (seenUrls.has(item.url)) continue
    seenUrls.add(item.url)
    try {
      const results = await resolveExtractors([item.url])
      for (const r of results) {
        if (seenUrls.has(r.url)) continue
        seenUrls.add(r.url)
        streams.push({
          server: item.name || 'AnimeDubHindi',
          quality: r.quality ? `${r.quality}p` : 'auto',
          type: r.type === 'm3u8' ? 'hls' : r.type === 'mpd' ? 'dash' : 'direct',
          url: r.url,
          headers: r.headers || (r.referer ? { Referer: r.referer, Origin: new URL(r.referer).origin } : undefined),
        })
      }
    } catch {}
  }

  return {
    status: streams.length ? 'ok' : 'error',
    provider: providerName,
    type: type as any,
    streams,
    subtitles: [],
    ...(streams.length === 0 ? { error: 'No streams found' } : {}),
  }
}
