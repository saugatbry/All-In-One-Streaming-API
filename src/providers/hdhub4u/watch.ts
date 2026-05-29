import { WatchResponse, StreamSource } from '@/core/types'
import { hdhub4uRedirect, hubdriveExtract, hubcloudExtract, genericExtract, resolveExtractors } from '@/core/extractors'

export async function watch(providerName: string, type: string, episodeId: string): Promise<WatchResponse> {
  let urls: string[]
  try { urls = JSON.parse(episodeId) } catch {
    return { status: 'error', provider: providerName, type: type as any, streams: [], subtitles: [], error: 'Invalid episode data' }
  }
  if (!urls?.length) {
    return { status: 'error', provider: providerName, type: type as any, streams: [], subtitles: [], error: 'No URLs' }
  }

  const streams: StreamSource[] = []
  const seenUrls = new Set<string>()

  for (const link of urls) {
    if (seenUrls.has(link)) continue
    seenUrls.add(link)

    try {
      let finalLink = link
      if (link.includes('?id=')) {
        const resolved = await hdhub4uRedirect(link)
        if (resolved) finalLink = resolved
      }

      let results: any[] = []
      if (finalLink.toLowerCase().includes('hubdrive')) {
        results = await hubdriveExtract(finalLink)
      } else if (finalLink.toLowerCase().includes('hubcloud')) {
        results = await hubcloudExtract(finalLink)
      } else {
        results = await resolveExtractors([finalLink])
      }

      for (const r of results) {
        if (seenUrls.has(r.url)) continue
        seenUrls.add(r.url)
        streams.push({
          server: r.name || 'HDHub4U',
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
