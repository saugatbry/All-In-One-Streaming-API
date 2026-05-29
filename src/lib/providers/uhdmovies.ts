import * as cheerio from 'cheerio'
import { fetchText, fetchJson, fixUrl, fixUrlNull } from '../fetcher'

export const id = 'uhdmovies'
export const name = 'UHDmovies'
export const lang = 'en'
export const type = 'movie'
export const baseUrl = 'https://uhdmovies.rip'

const TMDB_API_KEY = '1865f43a0549ca50d341dd9ab8b29f49'
const TMDB_BASE = 'https://api.themoviedb.org/3'
const TMDB_IMG = 'https://image.tmdb.org/t/p/original'

async function fetchIds(title: string, year?: number, isSeries?: boolean) {
  const type = isSeries ? 'tv' : 'movie'
  let url = `${TMDB_BASE}/search/${type}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}`
  if (year) {
    url += isSeries ? `&first_air_date_year=${year}` : `&year=${year}`
  }
  try {
    const searchJson = await fetchJson<any>(url)
    const result = searchJson.results?.[0]
    if (!result) return { tmdbId: null, imdbId: null }
    const tmdbId = result.id
    const extJson = await fetchJson<any>(`${TMDB_BASE}/${type}/${tmdbId}/external_ids?api_key=${TMDB_API_KEY}`)
    return { tmdbId, imdbId: extJson.imdb_id || null }
  } catch {
    return { tmdbId: null, imdbId: null }
  }
}

async function fetchMetaData(imdbId: string, isSeries: boolean) {
  const metaType = isSeries ? 'series' : 'movie'
  try {
    return await fetchJson<any>(`https://v3-cinemeta.strem.io/meta/${metaType}/${imdbId}.json`)
  } catch {
    return null
  }
}

export async function mainPage(page: number = 1) {
  const categories = [
    { name: 'Home', url: '' },
    { name: 'Movies', url: 'movies/' },
    { name: 'TV Series', url: 'tv-series/' },
    { name: 'Hollywood', url: 'movies/collection-movies/' },
    { name: 'Web Series', url: 'web-series/' },
    { name: 'Netflix', url: 'tv-shows/netflix/' },
    { name: 'Amazon Prime', url: 'amazon-prime/' },
    { name: '4K HDR', url: '4k-hdr/' },
    { name: 'IMAX', url: 'imax/' },
  ]
  const results: any[] = []
  for (const cat of categories) {
    const url = page === 1 ? `${baseUrl}/${cat.url}` : `${baseUrl}/${cat.url}page/${page}/`
    try {
      const html = await fetchText(url)
      const $ = cheerio.load(html)
      const items = $('article.gridlove-post').map((_, el) => {
        const $el = $(el)
        const titleRaw = $el.find('h1.sanket').text().trim().replace('Download ', '')
        const title = titleRaw
        const href = fixUrl($el.find('div.entry-image > a').attr('href') || '', baseUrl)
        const posterUrl = fixUrlNull($el.find('div.entry-image > a > img').attr('src'), baseUrl)
        const isSeries = /season|S0\d|episode/i.test(titleRaw)
        return { title, url: href, posterUrl, type: isSeries ? 'series' : 'movie' }
      }).get()
      if (items.length) results.push({ name: cat.name, items })
    } catch {}
  }
  return { results }
}

export async function search(query: string, page: number = 1) {
  const html = await fetchText(`${baseUrl}?s=${encodeURIComponent(query)}`)
  const $ = cheerio.load(html)
  return $('article.gridlove-post').map((_, el) => {
    const $el = $(el)
    const titleRaw = $el.find('h1.sanket').text().trim().replace('Download ', '')
    const title = titleRaw
    const href = fixUrl($el.find('div.entry-image > a').attr('href') || '', baseUrl)
    const posterUrl = fixUrlNull($el.find('div.entry-image > a > img').attr('src'), baseUrl)
    const isSeries = /season|S0\d|episode/i.test(titleRaw)
    return { title, url: href, posterUrl, type: isSeries ? 'series' : 'movie' }
  }).get()
}

export async function info(url: string) {
  const html = await fetchText(url)
  const $ = cheerio.load(html)
  const titleRaw = $('div.gridlove-content div.entry-header h1.entry-title').text().trim().replace('Download ', '')
  const title = titleRaw.replace(/\s*\(.*?\)/, '').replace(/Season.*/, '').replace(/S0\d.*/, '').trim()
  const img = $('div.entry-content > p img').first()
  const poster = img.attr('src')
  const collectionPoster = $('meta[property=og:image]').attr('content')
  const yearMatch = titleRaw.match(/\((\d{4})\)/)
  const year = yearMatch ? parseInt(yearMatch[1]) : undefined
  const tags = $('div.entry-category > a.gridlove-cat').map((_, el) => $(el).text()).get()
  const isSeries = /Season|S0\d/i.test($('h1.entry-title').text() || '')
  const type = isSeries ? 'series' : 'movie'

  const ids = await fetchIds(title, year, isSeries)
  const meta = ids.imdbId ? await fetchMetaData(ids.imdbId, isSeries) : null
  const metaData = meta?.meta
  const metaVideos: any[] = metaData?.videos || []
  const background = metaData?.background || poster || collectionPoster
  const description = metaData?.description || ''
  const imdbRating = metaData?.imdbRating
  const trailer = $('p iframe').attr('src')
  const logoUrl = metaData?.logo

  if (type === 'series') {
    const episodes: any[] = []
    const episodesMap: Record<string, string[]> = {}
    let currentSeason = 1

    $('pre, p, a:contains(Episode)').each((_, el) => {
      const $el = $(el)
      const seasonMatch = $el.text().match(/(?:season|S)\s*(\d+)/i)
      if (seasonMatch) currentSeason = parseInt(seasonMatch[1]) || currentSeason
      if ($el.prop('tagName')?.toLowerCase() === 'a' && $el.text().toLowerCase().includes('episode') && !$el.text().toLowerCase().includes('zip')) {
        const epMatch = $el.text().match(/Episode\s*(\d+)/i)
        const epNum = epMatch ? parseInt(epMatch[1]) : null
        const epUrl = $el.attr('href')
        if (epNum && epUrl) {
          const key = `${currentSeason}-${epNum}`
          if (!episodesMap[key]) episodesMap[key] = []
          episodesMap[key].push(epUrl)
        }
      }
    })

    for (const [key, urls] of Object.entries(episodesMap)) {
      const [s, e] = key.split('-').map(Number)
      if (!s || !e) continue
      const epMeta = metaVideos.find((v: any) => v.season === s && v.episode === e)
      episodes.push({
        name: epMeta?.name || epMeta?.title || `Episode ${e}`,
        season: s,
        episode: e,
        posterUrl: epMeta?.thumbnail || epMeta?.poster || '',
        description: epMeta?.overview || epMeta?.description || '',
        streamData: urls.map((u: string) => ({ sourceName: 'UHD', sourceLink: u })),
      })
    }

    return {
      title, url, posterUrl: poster?.trim() || collectionPoster, backgroundUrl: background,
      year, tags, plot: description, rating: imdbRating, trailer, logoUrl: logoUrl || undefined,
      type: 'series', episodes, ids,
    }
  }

  // Movie
  const iframeData: any[] = []
  $('div.entry-content > p').each((_, el) => {
    const $el = $(el)
    const text = $el.text()
    if (text.match(/\[.*\]/)) {
      const link = $el.next()?.find('a.maxbutton-1')?.attr('href') || ''
      iframeData.push({ sourceName: text.split('Download')[0].trim(), sourceLink: link })
    }
  })

  return {
    title, url, posterUrl: poster?.trim() || collectionPoster, backgroundUrl: background,
    year, tags, plot: description, rating: imdbRating, trailer, logoUrl: logoUrl || undefined,
    type: 'movie', streamData: iframeData, ids,
  }
}

export async function streams(data: any) {
  const sources = Array.isArray(data) ? data : (data.streamData || [])
  if (typeof data === 'string' && data.startsWith('http')) {
    // Single URL
    let finalUrl = data.includes('unblockedgames') ? data : data
    return [{ url: finalUrl, type: 'extractor', name: 'UHDmovies' }]
  }
  if (typeof sources === 'string' && sources.startsWith('http')) {
    return [{ url: sources, type: 'extractor', name: 'UHDmovies' }]
  }
  const results: any[] = []
  for (const src of sources) {
    const link = src.sourceLink || src
    if (link) {
      results.push({
        name: src.sourceName || 'UHD',
        url: link,
        type: 'extractor',
      })
    }
  }
  return results
}
