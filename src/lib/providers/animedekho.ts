import * as cheerio from 'cheerio'
import { fetchText, fetchDocument, fixUrl, fixUrlNull } from '../fetcher'
import { resolveExtractors } from '../extractors'

export const id = 'animedekho'
export const name = 'Anime Dekho'
export const lang = 'hi'
export const type = 'anime'
export const baseUrl = 'https://animedekho.app'

export async function mainPage(page: number = 1) {
  const categories = [
    '/series/', '/movie/', '/category/anime/', '/category/cartoon/',
    '/category/crunchyroll/', '/category/hindi-dub/', '/category/tamil/', '/category/telugu/',
  ]
  const results: any[] = []
  for (const cat of categories) {
    const html = await fetchText(`${baseUrl}${cat}`)
    const $ = cheerio.load(html)
    const items = $('article').map((_, el) => {
      const $el = $(el)
      const href = $el.find('a.lnk-blk').attr('href')
      if (!href) return null
      const title = $el.find('header h2').text() || 'No Title'
      let posterUrl = $el.find('div figure img').attr('src')
      if (posterUrl?.includes('data:image')) {
        posterUrl = $el.find('div figure img').attr('data-lazy-src')
      }
      return { title, url: href, posterUrl, type: 'anime' }
    }).get().filter(Boolean)
    results.push({ name: cat.replace(/\//g, ' ').trim() || 'Home', items })
  }
  return { results }
}

export async function search(query: string, page: number = 1) {
  const html = await fetchText(`${baseUrl}/?s=${encodeURIComponent(query)}`)
  const $ = cheerio.load(html)
  return $('ul[data-results] li article').map((_, el) => {
    const $el = $(el)
    const href = $el.find('a.lnk-blk').attr('href')
    if (!href) return null
    const title = $el.find('header h2').text() || 'No Title'
    let posterUrl = $el.find('div figure img').attr('src')
    if (posterUrl?.includes('data:image')) {
      posterUrl = $el.find('div figure img').attr('data-lazy-src')
    }
    return { title, url: href, posterUrl, type: 'anime' }
  }).get().filter(Boolean)
}

export async function info(url: string) {
  const html = await fetchText(url)
  const $ = cheerio.load(html)
  const rawTitle = $('h1.entry-title').text().trim()
  const title = rawTitle.replace('Watch Online ', '').replace(' Movie in Hindi Dubbed Free', '')
  const poster = $('div.post-thumbnail figure img').attr('src') || $('meta[property=og:image]').attr('content')
  const plot = $('div.entry-content p').first().text().trim() || $('meta[name=twitter:description]').attr('content')
  const year = parseInt($('span.year').text().trim()) || undefined
  const episodesEls = $('ul.seasons-lst li')
  if (episodesEls.length === 0) {
    return {
      title, url, posterUrl: poster, plot, year,
      type: 'movie',
      streamData: { url, mediaType: 1 },
    }
  }
  const episodes = episodesEls.map((_, el) => {
    const $el = $(el)
    const name = $el.find('h3.title').contents().first().text().trim() || 'Episode'
    const href = $el.find('a').attr('href') || ''
    const epPoster = $el.find('div > div > figure > img').attr('src')
    const seasonText = $el.find('h3.title > span').text()
    const season = parseInt(seasonText.match(/S(\d+)/)?.[1] || '1')
    return {
      name, season, episode: undefined, posterUrl: epPoster,
      streamData: { url: href, mediaType: 2 },
    }
  }).get()
  const recommendations = $('div.swiper-wrapper article').map((_, el) => {
    const $el = $(el)
    const recName = $el.find('h2').text() || 'Unknown'
    const recHref = $el.find('a').attr('href') || ''
    const recPoster = $el.find('figure img').attr('src')
    return { title: recName, url: recHref, posterUrl: recPoster }
  }).get()
  return { title, url, posterUrl: poster, plot, year, type: 'series', episodes, recommendations }
}

export async function streams(data: any) {
  const mediaUrl = data?.url || data?.streamData?.url || data
  if (!mediaUrl) return []
  const results: any[] = []

  const headers = { Cookie: 'toronites_server=vidstream' }
  try {
    const html1 = await fetchText(mediaUrl, { headers })
    const $1 = cheerio.load(html1)
    const iframeSrcs: string[] = []
    $1('iframe.serversel[src]').each((_, el) => {
      const src = $1(el).attr('src')
      if (src) iframeSrcs.push(src)
    })
    if (iframeSrcs.length > 0) {
      const ex = await resolveExtractors(iframeSrcs)
      results.push(...ex)
    }
  } catch {}

  try {
    const bodyClass = await fetchText(mediaUrl)
    const termMatch = bodyClass.match(/(?:term|postid)-(\d+)/)
    const term = termMatch?.[1]
    if (term) {
      for (let i = 0; i <= 10; i++) {
        try {
          const iframeHtml = await fetchText(`${baseUrl}/?trdekho=${i}&trid=${term}&trtype=${data.mediaType || 2}`)
          const $ = cheerio.load(iframeHtml)
          const iframeSrc = $('iframe').attr('src')
          if (iframeSrc) {
            const ex = await resolveExtractors([iframeSrc])
            results.push(...ex)
            break
          }
        } catch {}
      }
    }
  } catch {}

  return results.length > 0 ? results : [{ url: mediaUrl, type: 'extractor' }]
}
