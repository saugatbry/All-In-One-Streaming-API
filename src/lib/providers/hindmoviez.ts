import * as cheerio from 'cheerio'
import { fetchText, fetchJson, fixUrl, fixUrlNull } from '../fetcher'
import { resolveExtractors } from '../extractors'

export const id = 'hindmoviez'
export const name = 'Hindmoviez'
export const lang = 'hi'
export const type = 'movie'
export const baseUrl = 'https://hindmoviez.cafe'

export async function mainPage(page: number = 1) {
  const categories = [
    { name: 'HomePage', url: '' },
    { name: 'Movies', url: 'movies' },
    { name: 'Web Series', url: 'web-series' },
    { name: 'Korean Dramas', url: 'dramas/korean-drama' },
    { name: 'Chinese Dramas', url: 'dramas/chinese-drama' },
    { name: 'Anime', url: 'anime' },
  ]
  const results: any[] = []
  for (const cat of categories) {
    const u = page === 1 ? `${baseUrl}/${cat.url}` : `${baseUrl}/${cat.url}/page/${page}`
    try {
      const html = await fetchText(u)
      const $ = cheerio.load(html)
      const items = $('article').map((_, el) => {
        const $el = $(el)
        const title = $el.find('h2.entry-title a').text().trim()
        const href = fixUrl($el.find('a').attr('href') || '', baseUrl)
        const img = $el.find('header.entry-header img')
        const poster = img.attr('data-src') || img.attr('src') || undefined
        return { title, url: href, posterUrl: poster, type: 'movie' }
      }).get().filter(i => i.title)
      if (items.length) results.push({ name: cat.name, items })
    } catch {}
  }
  return { results }
}

export async function search(query: string, page: number = 1) {
  const html = await fetchText(`${baseUrl}/page/${page}/?s=${encodeURIComponent(query)}`)
  const $ = cheerio.load(html)
  return $('article').map((_, el) => {
    const $el = $(el)
    const title = $el.find('h2.entry-title a').text().trim()
    const href = fixUrl($el.find('a').attr('href') || '', baseUrl)
    const img = $el.find('header.entry-header img')
    const poster = img.attr('data-src') || img.attr('src') || undefined
    return { title, url: href, posterUrl: poster, type: 'movie' }
  }).get().filter(i => i.title)
}

export async function info(url: string) {
  const html = await fetchText(url)
  const $ = cheerio.load(html)

  let title = ''
  let imdbRating = ''
  let imdbId = ''
  let year = ''
  let genres: string[] = []
  let description = ''
  const poster = $('meta[property=og:image]').attr('content') || ''

  $('ul > li').each((_, el) => {
    const $el = $(el)
    const strongText = $el.find('strong').text().trim()
    const key = strongText.replace(':', '').trim()
    const value = $el.contents().last().text().trim()
    if (key === 'Name') title = value || strongText.split(':')[1]?.trim() || ''
    if (key === 'IMDB Rating') {
      imdbRating = value.split('/')[0]
      const imdbLink = $el.find('a[href*="/title/tt"]').attr('href')
      if (imdbLink) imdbId = imdbLink.split('/title/')[1]?.split('/')[0] || ''
    }
    if (key === 'Release Year') year = value
    if (key === 'Genre') genres = value.split(',').map((s: string) => s.trim()).filter(Boolean)
  })

  $('h3').each((_, el) => {
    if ($(el).text().trim().toLowerCase().includes('storyline')) {
      const next = $(el).next('p')
      if (next.length) description = next.text().trim()
    }
  })

  const isSeries = title.toLowerCase().includes('season')
  const mediaType = isSeries ? 'series' : 'movie'

  const result: any = { title: title || 'Unknown', url, posterUrl: poster, year: year || undefined, tags: genres.length ? genres : undefined, rating: imdbRating || undefined, type: mediaType, plot: description || undefined }

  if (imdbId) {
    result.imdbId = imdbId
    try {
      const findType = isSeries ? 'tv_results' : 'movie_results'
      const tmdbData = await fetchJson<any>(
        `https://api.themoviedb.org/3/find/${imdbId}?api_key=1865f43a0549ca50d341dd9ab8b29f49&external_source=imdb_id`
      )
      const tmdbItem = tmdbData?.movie_results?.[0] || tmdbData?.tv_results?.[0]
      if (tmdbItem) {
        const tmdbType = isSeries ? 'tv' : 'movie'
        const credits = await fetchJson<any>(
          `https://api.themoviedb.org/3/${tmdbType}/${tmdbItem.id}/credits?api_key=1865f43a0549ca50d341dd9ab8b29f49&language=en-US`
        )
        if (credits?.cast) {
          result.actors = credits.cast.slice(0, 10).map((c: any) => ({ name: c.name, image: c.profile_path ? `https://image.tmdb.org/t/p/original${c.profile_path}` : undefined }))
        }
      }
    } catch {}

    try {
      const cinemetaData = await fetchJson<any>(`https://v3-cinemeta.strem.io/meta/${mediaType}/${imdbId}.json`)
      if (cinemetaData?.meta) {
        if (cinemetaData.meta.background) result.backgroundUrl = cinemetaData.meta.background
        if (cinemetaData.meta.description) result.plot = cinemetaData.meta.description
        if (cinemetaData.meta.videos && isSeries) {
          result.episodesMeta = cinemetaData.meta.videos
        }
      }
    } catch {}
  }

  if (!isSeries) {
    const links: string[] = []
    $('a.maxbutton').each((_, el) => {
      const href = $(el).attr('href')
      if (href) links.push(href)
    })
    const resolved = await Promise.all(links.map(async (l) => {
      try {
        const lHtml = await fetchText(l)
        const $l = cheerio.load(lHtml)
        const getLinks = $l('div.entry-content a:contains(Get Links)')
        return getLinks.first().attr('href') || l
      } catch { return l }
    }))
    result.streamData = resolved.filter(Boolean)
  } else {
    const episodes: any[] = []
    const seasonHeaders = $('h3').filter((_, el) => /Season\s+\d+/i.test($(el).text()))

    for (let i = 0; i < seasonHeaders.length; i++) {
      const $h3 = $(seasonHeaders[i])
      const seasonNum = parseInt($h3.text().match(/Season\s+(\d+)/i)?.[1] || '1')
      const nextP = $h3.next('p')
      const seasonLink = nextP.find('a').first().attr('href')
      if (!seasonLink) continue
      try {
        const epHtml = await fetchText(seasonLink)
        const $ep = cheerio.load(epHtml)
        $ep('h3 > a').each((_, a) => {
          const epText = $ep(a).text().trim()
          const epNum = parseInt(epText.match(/Episode\s+(\d+)/i)?.[1] || '0')
          if (!epNum) return
          const epHref = $ep(a).attr('href')
          episodes.push({
            name: epText,
            season: seasonNum,
            episode: epNum,
            streamData: epHref ? [epHref] : [],
          })
        })
      } catch {}
    }
    if (result.episodesMeta) {
      episodes.forEach((ep) => {
        const meta = result.episodesMeta.find((v: any) => v.season === ep.season && v.episode === ep.episode)
        if (meta) {
          ep.name = meta.name || ep.name
          ep.posterUrl = meta.thumbnail || meta.poster
          ep.description = meta.overview || meta.description
        }
      })
    }
    result.episodes = episodes
    delete result.episodesMeta
  }

  return result
}

export async function streams(data: any) {
  const links: string[] = Array.isArray(data) ? data : (data.streamData || [data])
  const urls = links.filter(Boolean)
  if (urls.length === 0) return []
  return resolveExtractors(urls)
}
