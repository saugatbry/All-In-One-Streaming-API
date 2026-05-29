import * as cheerio from 'cheerio'
import { http } from '@/core/utils/request'
import { InfoResponse, EpisodeInfo } from '@/core/types'
import { BASE_URL, getBaseHeaders } from './headers'

export async function info(providerName: string, url: string): Promise<InfoResponse> {
  const html = await http.get(url, { headers: getBaseHeaders() })
  const $ = cheerio.load(html)

  const title = ($('h1.entry-title').text().trim() || $('meta[property=og:title]').attr('content') || '')
    .replace('Watch Online ', '').replace(' Movie in Hindi Dubbed Free', '').trim()
  const poster = $('div.post-thumbnail figure img').attr('src') || undefined
  const plot = $('div.entry-content p').first().text().trim() || $('meta[name=twitter:description]').attr('content') || undefined

  const yearStr = $('span.year').text().trim() || $('meta[property=og:updated_time]').attr('content')?.split('-')[0]
  const year = yearStr ? parseInt(yearStr) : undefined

  const hasSeasons = $('ul.seasons-lst li').length > 0

  if (!hasSeasons) {
    const media = JSON.stringify({ url, mediaType: 1 })
    return { provider: providerName, id: media, title, type: 'movie', poster, description: plot, year }
  }

  const episodes: EpisodeInfo[] = []
  $('ul.seasons-lst li').each((_, li) => {
    const $li = $(li)
    const name = $li.find('h3.title').contents().first().text().trim() || 'Episode'
    const href = $li.find('a').attr('href')
    const epPoster = $li.find('div > div > figure > img').attr('src') || undefined
    const seasonText = $li.find('h3.title > span').text()
    const season = parseInt(seasonText.split('S')[1]?.split('-')[0]) || undefined
    if (href) {
      const media = JSON.stringify({ url: href, poster: epPoster, mediaType: 2 })
      episodes.push({ name, season, episode: episodes.length + 1, id: media, thumbnail: epPoster })
    }
  })

  return { provider: providerName, id: url, title, type: 'anime', poster, description: plot, year, episodes }
}
