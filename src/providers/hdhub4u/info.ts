import * as cheerio from 'cheerio'
import { http } from '@/core/utils/request'
import { InfoResponse, EpisodeInfo } from '@/core/types'
import { getBaseHeaders, getDomainUrl } from './headers'
import { hdhub4uRedirect } from '@/core/extractors'

const TMDB_KEY = '1865f43a0549ca50d341dd9ab8b29f49'
const TMDB_BASE = 'https://image.tmdb.org/t/p/original'
const TMDB_API = 'https://api.themoviedb.org/3'

export async function info(providerName: string, url: string): Promise<InfoResponse> {
  const mainUrl = await getDomainUrl()
  const pageUrl = url.startsWith('http') ? url : `${mainUrl}/${url.replace(/^\//, '')}`
  const html = await http.get(pageUrl, { headers: getBaseHeaders() })
  const $ = cheerio.load(html)

  let title = $('h2[data-ved]').first().text().trim()
  if (!title) title = $('h1.page-title').text().trim()
  if (!title) throw new Error('Title not found')

  const poster = $('main.page-body img.aligncenter').attr('src') || $('meta[property=og:image]').attr('content') || undefined
  const plot = $('.kno-rdesc .kno-rdesc').text().trim() || undefined
  const tags = $('.page-meta em').map((_, el) => $(el).text()).get()
  const typeraw = $('h1.page-title span').text()
  const isMovie = typeraw.toLowerCase().includes('movie')
  const type: 'movie' | 'series' = isMovie ? 'movie' : 'series'
  const trailer = $('.responsive-embed-container > iframe:nth-child(1)').attr('src')?.replace('/embed/', '/watch?v=') || undefined

  const imdbUrl = $('div span a[href*="imdb.com"]').attr('href') || ''
  const seasonNumber = (() => {
        const m = title.match(/\bSeason\s*(\d+)\b/i)
    return m ? parseInt(m[1]) : undefined
  })()

  // TMDB resolution
  let tmdbId = ''
  const tmdbHref = $('div span a[href*="themoviedb.org"]').attr('href') || ''
  if (tmdbHref) tmdbId = tmdbHref.split('/').pop()?.split('-')[0]?.split('?')[0] || ''

  if (!tmdbId && imdbUrl) {
    const imdbIdOnly = imdbUrl.split('title/')[1]?.split('/')[0] || ''
    if (imdbIdOnly) {
      try {
        const findJson: any = await http.json(`${TMDB_API}/find/${imdbIdOnly}?api_key=${TMDB_KEY}&external_source=imdb_id`)
        const results = isMovie ? findJson.movie_results : findJson.tv_results
        if (results?.length) tmdbId = String(results[0].id)
      } catch {}
    }
  }

  let description = plot
  let genres: string[] | undefined = tags.length ? tags : undefined
  let year: number | undefined
  let banner = poster
  let cast: { name: string; image?: string; role?: string }[] | undefined
  let rating: number | undefined

  if (tmdbId) {
    try {
      const tmdbType = isMovie ? 'movie' : 'tv'
      const details: any = await http.json(`${TMDB_API}/${tmdbType}/${tmdbId}?api_key=${TMDB_KEY}&append_to_response=credits,external_ids`)

      const metaDesc = details.overview || plot
      const metaYear = (details.release_date || details.first_air_date || '').slice(0, 4)
      const metaRating = details.vote_average
      const metaBackground = details.backdrop_path ? `${TMDB_BASE}${details.backdrop_path}` : poster

      if (metaDesc) description = metaDesc
      if (metaYear) year = parseInt(metaYear)
      if (metaRating) rating = parseFloat(metaRating)
      if (metaBackground) banner = metaBackground
      if (details.genres) genres = details.genres.map((g: any) => g.name).filter(Boolean)
      if (details.credits?.cast) {
        cast = details.credits.cast.slice(0, 20).map((c: any) => ({
          name: c.name || c.original_name || '',
          image: c.profile_path ? `${TMDB_BASE}${c.profile_path}` : undefined,
          role: c.character || undefined,
        }))
      }
    } catch {}
  }

  const result: InfoResponse = {
    provider: providerName, id: pageUrl, title, type, description,
    genres: genres?.length ? genres : undefined, rating, year, poster, banner,
    cast: cast?.length ? cast : undefined, trailer,
  }

  if (isMovie) {
    const links: string[] = []
    $('h3 a, h4 a').each((_, el) => {
      const href = $(el).attr('href') || ''
      if (/(480|720|1080|2160|4K)/i.test(href) && !links.includes(href)) links.push(href)
    })
    $('.page-body > div a').each((_, el) => {
      const href = $(el).attr('href') || ''
      if (/(hdstream4u|hubstream)/i.test(href) && !links.includes(href)) links.push(href)
    })
    if (links.length) result.episodes = [{ name: 'Movie', season: 1, episode: 1, id: JSON.stringify(links) }]
  } else {
    const epLinksMap = new Map<number, string[]>()
    const episodeRegex = /EPISODE\s*(\d+)/i

    const directCalls: { baseLinks: string[] }[] = []

    $('h3, h4').each((_, el) => {
      const $el = $(el)
      const text = $el.text()
      const epNumMatch = text.match(episodeRegex)
      const epNum = epNumMatch ? parseInt(epNumMatch[1]) : null
      const baseLinks = $el.find('a[href]').map((_, a) => $(a).attr('href') || '').get().filter(Boolean)

      const isDirectBlock = $el.find('a').toArray().some(a => /1080|720|4K|2160/i.test($(a).text()))

      if (isDirectBlock) {
        directCalls.push({ baseLinks })
      } else if (epNum !== null) {
        const allLinks = [...baseLinks]
        if ($el.is('h4')) {
          let next = $el.next()
          while (next.length && !next.is('hr')) {
            next.find('a[href]').each((_, a) => {
              const h = $(a).attr('href') || ''
              if (h && !allLinks.includes(h)) allLinks.push(h)
            })
            next = next.next()
          }
        }
        if (allLinks.length) {
          const existing = epLinksMap.get(epNum) || []
          epLinksMap.set(epNum, [...existing, ...allLinks])
        }
      }
    })

    // Resolve direct blocks (links with quality text -> redirect -> sub pages with episodes)
    await Promise.all(directCalls.map(({ baseLinks }) =>
      Promise.all(baseLinks.map(link =>
        (async () => {
          try {
            const resolvedUrl = await hdhub4uRedirect(link.trim())
            if (!resolvedUrl) return
            const subHtml = await http.get(resolvedUrl, { headers: getBaseHeaders() })
            const $$ = cheerio.load(subHtml)
            $$('h5 a').each((_, a) => {
              const subText = $$(a).text()
              const subHref = $$(a).attr('href') || ''
              if (!subHref) return
              const subEpNum = subText.match(/Episode\s*(\d+)/i)
              const ep = subEpNum ? parseInt(subEpNum[1]) : null
              if (ep !== null) {
                const existing = epLinksMap.get(ep) || []
                epLinksMap.set(ep, [...existing, subHref])
              }
            })
          } catch {}
        })()
      ))
    ))

    const episodes: EpisodeInfo[] = []
    for (const [epNum, rawLinks] of epLinksMap) {
      const deduplicated = [...new Set(rawLinks)]
      episodes.push({
        name: `Episode ${epNum}`,
        season: seasonNumber || 1,
        episode: epNum,
        id: JSON.stringify(deduplicated),
      })
    }
    if (episodes.length) result.episodes = episodes
  }

  return result
}
