import * as cheerio from 'cheerio'
import { http } from '../utils/request'
import { MediaInfo, EpisodeInfo, ActorData, SearchResult } from '../types'
import { ensureSession, BASE_URL } from './session'
import { fixUrl, fixUrlNull, getBaseUrl } from '../utils/helpers'
import { cache } from '../utils/cache'

interface GetFile {
  file: string; key?: string; id?: string
}

interface Extract {
  title?: string; id?: string; file?: string
}

interface StreamPayload {
  playerDomain: string; tokenKey: string; items: Extract[]; raw: string
}

function extractJsonObject(script: string): string | null {
  const start = script.indexOf('{')
  const end = script.lastIndexOf('}')
  if (start === -1 || end <= start) return null
  return script.substring(start, end + 1)
}

async function getDlPayload(link: string, refererUrl: string, playerDomain: string): Promise<StreamPayload> {
  const cookies = await ensureSession()
  const html = await http.get(link, { referer: refererUrl, cookies })
  const $ = cheerio.load(html)

  const scriptText = $('body > script:last-child').html() || ''
  const jsonStr = extractJsonObject(scriptText)
  if (!jsonStr) return { playerDomain, tokenKey: '', items: [], raw: '[]' }

  const json: GetFile = JSON.parse(jsonStr)
  const tokenKey = json.key || ''
  const fileUrl = json.file.startsWith('http') ? json.file : getBaseUrl(link) + json.file

  let m3u8Langs = await http.post(fileUrl, '', {
    referer: link,
    headers: { 'X-CSRF-TOKEN': tokenKey },
  })
  m3u8Langs = m3u8Langs.replace(/,\s*\[\]/g, '')
  const items: Extract[] = JSON.parse(m3u8Langs)

  return { playerDomain, tokenKey, items, raw: JSON.stringify(items) }
}

export async function getInfo(url: string): Promise<MediaInfo> {
  const cached = cache.get<MediaInfo>(`info:${url}`)
  if (cached) return cached

  const cookies = await ensureSession()
  const html = await http.get(url, { cookies })
  const $ = cheerio.load(html)

  const title = $('h1.fs__title').text().trim()
  if (!title) throw new Error('Title not found')

  const poster = fixUrlNull($('img.fs__poster-img').attr('src'), BASE_URL)

  const tags: string[] = []
  $('div.xfs__item--value[itemprop=genre] > a').each((_, el) => {
    tags.push($(el).text())
  })

  const yearMatch = title.match(/\((\d{4})\)/)
  const year = yearMatch ? parseInt(yearMatch[1]) : undefined

  const description = $('div.fs__descr--text > p').map((_, el) => $(el).text().trim()).get().join(' ')

  const isMovie = tags.some(t => t.toLowerCase().includes('films'))
  const isSeries = tags.some(t => t.toLowerCase().includes('series'))
  const mediaType: 'movie' | 'series' | 'cartoon' = isSeries ? 'series' : isMovie ? 'movie' : 'movie'

  const rating = $('b.imdb__value').text().replace(',', '.')
  const durationText = $('li.xfs__item_op:nth-child(3) > b').text()
  const duration = parseInt(durationText.replace(' min.', '').trim()) || undefined

  const actors: ActorData[] = []
  $('div.xfs__item_op > b[itemprop=actors]').text().split(', ').filter(Boolean).forEach((n: string) => {
    actors.push({ name: n })
  })

  const trailer = $('iframe[src*="youtube"]').attr('src')

  const recommendations: SearchResult[] = []
  $('li.short-mid').each((_, el) => {
    const $el = $(el)
    const t = $el.find('a > h3').text().trim()
    const h = fixUrl($el.find('a').attr('href') || '', BASE_URL)
    const p = fixUrlNull($el.find('img').attr('data-src'), BASE_URL)
    if (t && h) recommendations.push({ title: t, url: h, posterUrl: p, type: 'movie' })
  })

  const result: MediaInfo = {
    title,
    url,
    posterUrl: poster,
    backgroundUrl: poster,
    year,
    plot: description,
    tags,
    rating,
    duration,
    actors: actors.length > 0 ? actors : undefined,
    trailer,
    recommendations,
    type: mediaType,
  }

  const playerScript = $.html().match(/const AwsIndStreamDomain.*'(.*)';/)
  const playerDomain = playerScript?.[1]
  const idMatch = $.html().match(/src:.'(\D+\d+)/)
  const id = idMatch?.[1]

  if (playerDomain && id) {
    const embedLink = `${playerDomain}/play/${id}`
    const streamPayload = await getDlPayload(embedLink, url, playerDomain)

    if (mediaType === 'series') {
      const episodes: EpisodeInfo[] = []
      const folderJson = streamPayload.raw

      if (folderJson.includes('"folder"')) {
        const seasons: any[] = JSON.parse(folderJson)
        for (const season of seasons) {
          const sNum = parseInt(season.id) || undefined
          for (const ep of (season.folder || [])) {
            episodes.push({
              name: ep.title || `Episode ${ep.episode || ''}`,
              season: sNum,
              episode: parseInt(ep.episode) || undefined,
              posterUrl: poster,
              streamData: {
                playerDomain: streamPayload.playerDomain,
                tokenKey: streamPayload.tokenKey,
                links: (ep.folder || []).map((f: any) => ({
                  title: f.title, id: f.id, file: f.file
                })),
              },
            })
          }
        }
      } else {
        episodes.push({
          name: '1 episode',
          season: 1,
          episode: 1,
          streamData: streamPayload,
        })
      }

      result.episodes = episodes
    } else {
      result.streamData = streamPayload
    }
  }

  cache.set(`info:${url}`, result, 300_000)
  return result
}
