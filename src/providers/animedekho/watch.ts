import * as cheerio from 'cheerio'
import { http } from '@/core/utils/request'
import { WatchResponse, StreamSource } from '@/core/types'
import { BASE_URL, getBaseHeaders } from './headers'
import { genericExtract, resolveExtractors } from '@/core/extractors'
import { ub64 } from '@/core/utils/helpers'

export async function watch(providerName: string, type: string, episodeId: string): Promise<WatchResponse> {
  let media: { url: string; mediaType?: number }
  try { media = JSON.parse(ub64(episodeId)) } catch {
    return { status: 'error', provider: providerName, type: type as any, streams: [], subtitles: [], error: 'Invalid episode data' }
  }

  const url = media.url
  const mediaType = media.mediaType ?? 2
  if (!url) {
    return { status: 'error', provider: providerName, type: type as any, streams: [], subtitles: [], error: 'No url' }
  }

  const streams: StreamSource[] = []
  const seenUrls = new Set<string>()

  const addStreams = (results: { name?: string; url: string; type: string; quality?: number; headers?: Record<string, string>; referer?: string }[]) => {
    for (const r of results) {
      if (seenUrls.has(r.url)) continue
      seenUrls.add(r.url)
      const stype: StreamSource['type'] = r.type === 'm3u8' ? 'hls' : r.type === 'mpd' ? 'dash' : 'direct'
      streams.push({
        server: r.name || 'AnimeDekho',
        quality: r.quality ? `${r.quality}p` : 'auto',
        type: stype,
        url: r.url,
        headers: r.headers || (r.referer ? { Referer: r.referer, Origin: new URL(r.referer).origin } : undefined),
      })
    }
  }

  // Step 1: VidStream cookie approach
  try {
    const cookieHtml = await http.get(url, {
      headers: { ...getBaseHeaders(), Cookie: 'toronites_server=vidstream' },
      timeout: 10000,
    })
    const $cookie = cheerio.load(cookieHtml)
    const iframePromises: Promise<void>[] = []
    $cookie('iframe.serversel[src]').each((_, el) => {
      const src = $cookie(el).attr('src') || ''
      if (!src) return
      iframePromises.push((async () => {
        try {
          const innerHtml = await http.get(src, { timeout: 10000 })
          const $inner = cheerio.load(innerHtml)
          const innerSrc = $inner('iframe[src]').attr('src')
          if (innerSrc) {
            const results = await resolveExtractors([innerSrc])
            addStreams(results)
          }
        } catch {}
      })())
    })
    await Promise.all(iframePromises)
  } catch {}

  // Step 2: trdekho approach
  try {
    const cleanHtml = await http.get(url, { headers: getBaseHeaders(), timeout: 10000 })
    const $clean = cheerio.load(cleanHtml)
    const bodyClass = $clean('body').attr('class') || ''
    const termMatch = bodyClass.match(/(?:term|postid)-(\d+)/)
    const term = termMatch?.[1]

    if (term) {
      const trPromises: Promise<void>[] = []
      for (let i = 0; i <= 10; i++) {
        trPromises.push((async () => {
          try {
            const trHtml = await http.get(`${BASE_URL}/?trdekho=${i}&trid=${term}&trtype=${mediaType}`, { timeout: 10000 })
            const $tr = cheerio.load(trHtml)
            const iframeSrc = $tr('iframe').attr('src')
            if (iframeSrc) {
              const results = await resolveExtractors([iframeSrc])
              addStreams(results)
            }
          } catch {}
        })())
      }
      await Promise.all(trPromises)
    }
  } catch {}

  return {
    status: streams.length > 0 ? 'ok' : 'error',
    provider: providerName,
    type: type as any,
    streams,
    subtitles: [],
    ...(streams.length === 0 ? { error: 'No streams found' } : {}),
  }
}
