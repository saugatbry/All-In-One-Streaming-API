import * as cheerio from 'cheerio'
import { http } from '@/core/utils/request'
import { InfoResponse, EpisodeInfo } from '@/core/types'
import { BASE_URL, getBaseHeaders } from './headers'

export async function info(providerName: string, url: string): Promise<InfoResponse> {
  const html = await http.get(url, { headers: getBaseHeaders() })
  const $ = cheerio.load(html)

  const infoMap: Record<string, string> = {}
  $('ul.wp-block-list li').each((_, li) => {
    const strong = $(li).find('strong').first()
    const key = strong.text().replace(/:$/, '').trim()
    const value = strong.length ? $(li).text().replace(strong.text(), '').trim() : $(li).text().trim()
    if (key) infoMap[key] = value
  })

  const iframeUrl = $('div.wp-block-button a').attr('href') || ''

  const rawtitle = $('meta[property=og:title]').attr('content') || ''
  const title = rawtitle.split('(')[0].trim()
  const description = ($('div.entry-content p').first().text().trim() || '') + '\n' + (infoMap['Audio Tracks'] || '')
  const backgroundposter = $('div.entry-content img').first().attr('src') || ''
  const rating = (infoMap['MAL Rating'] || infoMap['IMDb Rating'] || '').split('/')[0] || undefined
  const genres = (infoMap['Genres'] || '').split('|').map(s => s.trim()).filter(Boolean)
  const contentRating = infoMap['Official Dub By'] || undefined

  const isMovie = rawtitle.toLowerCase().includes('movie')

  if (!isMovie) {
    const iframeHtml = await http.get(iframeUrl.startsWith('http') ? iframeUrl : `${BASE_URL}/${iframeUrl}`, { headers: getBaseHeaders(), referer: url })
    const $i = cheerio.load(iframeHtml)
    const episodes: EpisodeInfo[] = []

    $i('div.wp-block-group').each((_, group) => {
      const $g = $i(group)
      const hasEpisodeH2 = $g.find('h2:contains(Episode)').length > 0
      const hasH4 = $g.find('h4').length > 0
      if (!hasEpisodeH2 || !hasH4) return

      const epText = $g.find('h2:contains(Episode)').text()
      const epNum = parseInt(epText.split('Episode:')[1]?.trim()) || undefined

      const links: { name: string; url: string }[] = []
      $g.find('a').each((_, a) => {
        const href = $i(a).attr('href') || ''
        if (!href || (!href.includes('hubcloud') && !href.includes('gdflix'))) return
        links.push({ name: $i(a).text().trim() || 'Link', url: href })
      })

      if (links.length) {
        episodes.push({ name: epNum ? `Episode ${epNum}` : epText, season: 1, episode: epNum, id: JSON.stringify(links) })
      }
    })

    $i('div.pro-ep-card').each((_, card) => {
      const $c = $i(card)
      const epText = $c.find('.pro-ep-title').text()
      const epNum = parseInt(epText.split('Episode:')[1]?.trim()) || undefined

      const links: { name: string; url: string }[] = []
      $c.find('.pro-btn-group a').each((_, a) => {
        const href = $i(a).attr('href') || ''
        if (!href || (!href.includes('hubcloud') && !href.includes('gdflix'))) return
        links.push({ name: $i(a).text().trim() || 'Link', url: href })
      })

      if (links.length) {
        episodes.push({ name: epNum ? `Episode ${epNum}` : epText, season: 1, episode: epNum, id: JSON.stringify(links) })
      }
    })

    return {
      provider: providerName, id: url, title, type: 'anime',
      description, genres: genres.length ? genres : undefined,
      rating: rating ? parseFloat(rating) : undefined,
      poster: backgroundposter, banner: backgroundposter,
      episodes: episodes.length ? episodes : undefined,
    }
  }

  // MOVIE
  let movieHtml = ''
  try {
    movieHtml = await http.get(iframeUrl.startsWith('http') ? iframeUrl : `${BASE_URL}/${iframeUrl}`, { headers: getBaseHeaders(), referer: url })
  } catch { movieHtml = '' }

  const links: { name: string; url: string }[] = []

  if (movieHtml) {
    const $m = cheerio.load(movieHtml)

    $m('div.entry-content h4').each((_, h4) => {
      const $h4 = $m(h4)
      const quality = $h4.contents().first().text().split('[Size')[0].trim()
      $h4.find('a').each((_, a) => {
        const href = $m(a).attr('href') || ''
        if (!href.includes('hubcloud') && !href.includes('gdflix')) return
        links.push({ name: `${$m(a).text()} ${quality}`.trim(), url: href })
      })
    })

    $m('div.pro-ep-card .pro-quality-wrapper').each((_, sec) => {
      const $sec = $m(sec)
      const quality = $sec.find('.pro-ep-quality').text().replace(/[\[\]]/g, '').trim()
      $sec.find('.pro-btn-group a').each((_, a) => {
        const href = $m(a).attr('href') || ''
        if (!href.includes('hubcloud') && !href.includes('gdflix')) return
        links.push({ name: `${$m(a).text()} ${quality}`.trim(), url: href })
      })
    })
  }

  return {
    provider: providerName, id: url, title, type: 'movie',
    description, genres: genres.length ? genres : undefined,
    rating: rating ? parseFloat(rating) : undefined,
    poster: backgroundposter, banner: backgroundposter,
    episodes: links.length ? [{ name: 'Movie', season: 1, episode: 1, id: JSON.stringify(links) }] : undefined,
  }
}
