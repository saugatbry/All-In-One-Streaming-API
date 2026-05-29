import * as cheerio from 'cheerio'
import { fetchText, fetchJson, fixUrl, fixUrlNull } from '../fetcher'

export const id = 'hdhub4u'
export const name = 'HDHub4u'
export const lang = 'hi'
export const type = 'movie'
export const baseUrl = 'https://hdhub4u.rehab'

const TMDB_KEY = '1865f43a0549ca50d341dd9ab8b29f49'

async function tmdbFindByImdb(imdbId: string) {
  try {
    return await fetchJson<any>(`https://api.themoviedb.org/3/find/${imdbId}?api_key=${TMDB_KEY}&external_source=imdb_id`)
  } catch { return null }
}

async function tmdbMovieCredits(tmdbId: number) {
  try {
    return await fetchJson<any>(`https://api.themoviedb.org/3/movie/${tmdbId}/credits?api_key=${TMDB_KEY}`)
  } catch { return null }
}

async function tmdbTvCredits(tmdbId: number) {
  try {
    return await fetchJson<any>(`https://api.themoviedb.org/3/tv/${tmdbId}/credits?api_key=${TMDB_KEY}`)
  } catch { return null }
}

async function tmdbMovieVideos(tmdbId: number) {
  try {
    return await fetchJson<any>(`https://api.themoviedb.org/3/movie/${tmdbId}/videos?api_key=${TMDB_KEY}`)
  } catch { return null }
}

async function tmdbTvVideos(tmdbId: number) {
  try {
    return await fetchJson<any>(`https://api.themoviedb.org/3/tv/${tmdbId}/videos?api_key=${TMDB_KEY}`)
  } catch { return null }
}

export async function mainPage(page: number = 1) {
  const categories = [
    { name: 'Latest', url: '' },
    { name: 'Bollywood', url: 'bollywood' },
    { name: 'Hollywood', url: 'hollywood' },
    { name: 'Hindi Dubbed', url: 'hindi-dubbed' },
    { name: 'South Hindi Movies', url: 'south-hindi-movies' },
    { name: 'Web Series', url: 'web-series' },
    { name: 'Adult', url: 'adult' },
  ]
  const results: any[] = []
  for (const cat of categories) {
    const url = cat.url ? `${baseUrl}/${cat.url}/page/${page}/` : `${baseUrl}/page/${page}/`
    const html = await fetchText(url)
    const $ = cheerio.load(html)
    const items = $('.recent-movies > li.thumb').map((_, el) => {
      const $el = $(el)
      const title = $el.find('figcaption > a > p').text().trim()
      const href = fixUrl($el.find('figure > a').attr('href') || '', baseUrl)
      const posterUrl = fixUrlNull($el.find('figure > img').attr('src'), baseUrl)
      return { title, url: href, posterUrl, type: 'movie' }
    }).get()
    results.push({ name: cat.name, items })
  }
  return { results }
}

export async function search(query: string, page: number = 1) {
  const url = `https://search.hdhub4u.glass/collections/post/documents/search?q=${encodeURIComponent(query)}&query_by=post_title,category&query_by_weights=4,2&sort_by=sort_by_date:desc&limit=15&highlight_fields=none&use_cache=true&page=${page}`
  const data = await fetchJson<any>(url)
  return (data.hits || []).map((hit: any) => {
    const doc = hit.document
    return {
      title: doc.postTitle,
      url: doc.permalink,
      posterUrl: doc.postThumbnail || undefined,
      type: 'movie',
    }
  })
}

export async function info(url: string) {
  const html = await fetchText(url)
  const $ = cheerio.load(html)

  const title = $('h2[data-ved]').text().trim()
  const poster = fixUrlNull($('main.page-body img.aligncenter').attr('src'), baseUrl) || fixUrlNull($('meta[property=og:image]').attr('content'), baseUrl)
  const plot = $('.kno-rdesc .kno-rdesc').text().trim()
  const tags = $('.page-meta em').map((_, el) => $(el).text().trim()).get()
  const trailer = $('.responsive-embed-container > iframe').attr('src')

  const pageTitle = $('h1.page-title span').text().toLowerCase()
  const isMovie = pageTitle.includes('movie')
  const mediaType = isMovie ? 'movie' : 'series'

  let actors: any[] = []
  let imdbId: string | undefined

  const imdbUrlMatch = $.html().match(/https:\/\/www\.imdb\.com\/title\/(tt\d+)/i)
  if (imdbUrlMatch) imdbId = imdbUrlMatch[1]

  if (imdbId) {
    const tmdbData = await tmdbFindByImdb(imdbId)
    if (tmdbData) {
      if (isMovie) {
        const movieResult = tmdbData.movie_results?.[0]
        if (movieResult) {
          const credits = await tmdbMovieCredits(movieResult.id)
          if (credits) {
            actors = (credits.cast || []).slice(0, 10).map((c: any) => ({
              name: c.name,
              image: c.profile_path ? `https://image.tmdb.org/t/p/w200${c.profile_path}` : undefined,
              role: c.character,
            }))
          }
        }
      } else {
        const tvResult = tmdbData.tv_results?.[0]
        if (tvResult) {
          const credits = await tmdbTvCredits(tvResult.id)
          if (credits) {
            actors = (credits.cast || []).slice(0, 10).map((c: any) => ({
              name: c.name,
              image: c.profile_path ? `https://image.tmdb.org/t/p/w200${c.profile_path}` : undefined,
              role: c.character,
            }))
          }
        }
      }
    }
  }

  if (mediaType === 'movie') {
    const links: string[] = []

    $('h3 a, h4 a').each((_, el) => {
      const $el = $(el)
      const href = $el.attr('href')
      if (href && /480|720|1080|2160|4K/i.test($el.text())) {
        links.push(href)
      }
    })

    $('.page-body > div a').each((_, el) => {
      const href = $(el).attr('href')
      if (href) links.push(href)
    })

    return {
      title,
      url,
      posterUrl: poster,
      plot,
      tags,
      trailer,
      actors: actors.length ? actors : undefined,
      type: 'movie' as const,
      streamData: links,
    }
  }

  const episodes: any[] = []

  $('h3, h4').each((_, el) => {
    const $el = $(el)
    const text = $el.text().trim()
    const epMatch = text.match(/EPISODE\s*(\d+)/i)
    if (epMatch) {
      const epNum = parseInt(epMatch[1])
      const links: string[] = []
      $el.find('a').each((_, a) => {
        const href = $(a).attr('href')
        if (href) links.push(href)
      })
      let nextEl = $el.next()
      while (nextEl.length && !nextEl.is('h3, h4')) {
        if (nextEl.is('a')) {
          const href = nextEl.attr('href')
          if (href) links.push(href)
        }
        nextEl = nextEl.next()
      }
      if (links.length) {
        episodes.push({
          name: `Episode ${epNum}`,
          season: 1,
          episode: epNum,
          streamData: links,
        })
      }
    }
  })

  return {
    title,
    url,
    posterUrl: poster,
    plot,
    tags,
    trailer,
    actors: actors.length ? actors : undefined,
    type: 'series' as const,
    episodes,
  }
}

export async function streams(data: any) {
  const links = Array.isArray(data) ? data : (data.streamData || [])
  return links.map((item: any) => {
    const url = typeof item === 'string' ? item : item.url
    return {
      name: url.includes('Hubdrive') ? 'Hubdrive' : 'Link',
      url,
      type: 'extractor',
    }
  })
}
