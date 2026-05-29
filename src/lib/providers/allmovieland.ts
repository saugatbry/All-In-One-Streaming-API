import * as cheerio from 'cheerio'
import { fetchText, fetchDocument, fixUrl, fixUrlNull, getBaseUrl } from '../fetcher'

export const id = 'allmovieland'
export const name = 'AllMovieLand'
export const lang = 'hi'
export const type = 'movie'
// Domain resolves to allmovieland.one (redirects from .you)
export const baseUrl = 'https://allmovieland.one'

async function querySearchApi(query: string) {
  return fetchText(`${baseUrl}/index.php?do=search&subaction=search&search_start=0&full_search=0&result_from=1&story=${encodeURIComponent(query)}`, {
    referer: `${baseUrl}/`,
  })
}

function extractJsonObject(script: string): string | null {
  const start = script.indexOf('{')
  const end = script.lastIndexOf('}')
  if (start === -1 || end <= start) return null
  return script.substring(start, end + 1)
}

async function getDlPayload(link: string, refererUrl: string, playerDomain: string) {
  const html = await fetchText(link, { referer: refererUrl })
  const $ = cheerio.load(html)
  const scriptText = $('body > script:last-child').html() || ''
  const jsonStr = extractJsonObject(scriptText)
  if (!jsonStr) return { playerDomain, tokenKey: '', items: [], raw: '[]' }
  const json = JSON.parse(jsonStr)
  const tokenKey = json.key || ''
  const fileUrl = json.file.startsWith('http') ? json.file : getBaseUrl(link) + json.file
  let m3u8Langs = await fetchText(fileUrl, {
    method: 'POST',
    referer: link,
    headers: { 'X-CSRF-TOKEN': tokenKey },
  })
  m3u8Langs = m3u8Langs.replace(/,\s*\[\]/g, '')
  const items = JSON.parse(m3u8Langs)
  return { playerDomain, tokenKey, items, raw: JSON.stringify(items) }
}

async function getM3u8(playerDomain: string, tokenKey: string, file: string): Promise<string> {
  return fetchText(`${playerDomain}/playlist/${file}.txt`, {
    headers: { 'X-CSRF-TOKEN': tokenKey },
    referer: `${baseUrl}/`,
  })
}

export async function mainPage(page: number = 1) {
  const categories = [
    { name: 'Movies', url: `${baseUrl}/films/` },
    { name: 'Bollywood Movies', url: `${baseUrl}/bollywood/` },
    { name: 'Hollywood Movies', url: `${baseUrl}/hollywood/` },
    { name: 'TV Shows', url: `${baseUrl}/series/` },
    { name: 'Cartoons', url: `${baseUrl}/cartoon/` },
  ]
  const results: any[] = []
  for (const cat of categories) {
    const url = page === 1 ? cat.url : `${cat.url}/page/${page}/`
    const html = await fetchText(url)
    const $ = cheerio.load(html)
    const items = $('article.short-mid').map((_, el) => {
      const $el = $(el)
      const title = $el.find('a.new-short__title--link > h3.new-short__title').text().trim()
      const href = $el.find('a.new-short__title--link').attr('href') || ''
      const posterUrl = $el.find('img.new-short__poster--img').attr('data-src') || undefined
      const checkType = $el.find('span.new-short__cats').text()
      const type = checkType.toLowerCase().includes('series') ? 'series' : 'movie'
      return { title, url: href, posterUrl: posterUrl?.startsWith('http') ? posterUrl : fixUrl(posterUrl || '', baseUrl), type }
    }).get()
    results.push({ name: cat.name, items })
  }
  return { results, hasNext: true }
}

export async function search(query: string, page: number = 1) {
  const html = await querySearchApi(query)
  const $ = cheerio.load(html)
  return $('article.short-mid').map((_, el) => {
    const $el = $(el)
    const title = $el.find('a.new-short__title--link > h3.new-short__title').text().trim()
    const href = $el.find('a.new-short__title--link').attr('href') || ''
    const posterUrl = $el.find('img.new-short__poster--img').attr('data-src') || undefined
    const checkType = $el.find('span.new-short__cats').text()
    const type = checkType.toLowerCase().includes('series') ? 'series' : 'movie'
    return { title, url: href, posterUrl: posterUrl?.startsWith('http') ? posterUrl : fixUrl(posterUrl || '', baseUrl), type }
  }).get()
}

export async function info(url: string) {
  const html = await fetchText(url)
  const $ = cheerio.load(html)
  const title = $('h1.fs__title').text().trim()
  const poster = fixUrlNull($('img.fs__poster-img').attr('src'), baseUrl)
  const tags = $('div.xfs__item--value[itemprop=genre] > a').map((_, el) => $(el).text()).get()
  const yearMatch = title.match(/\((\d{4})\)/)
  const year = yearMatch ? parseInt(yearMatch[1]) : undefined
  const description = $('div.fs__descr--text > p').map((_, el) => $(el).text().trim()).get().join(' ')
  const isMovie = tags.some(t => t.toLowerCase().includes('films'))
  const isSeries = tags.some(t => t.toLowerCase().includes('series'))
  const mediaType = isSeries ? 'series' : 'movie'
  const rating = $('b.imdb__value').text().replace(',', '.')
  const durationText = $('li.xfs__item_op:nth-child(3) > b').text()
  const duration = parseInt(durationText.replace(' min.', '').trim()) || undefined
  const actors = $('div.xfs__item_op > b[itemprop=actors]').text().split(', ').filter(Boolean).map((n: string) => ({ name: n }))
  const trailer = $('iframe[src*="youtube"]').attr('src')
  const recommendations = $('li.short-mid').map((_, el) => {
    const $el = $(el)
    const t = $el.find('a > h3').text().trim()
    const h = fixUrl($el.find('a').attr('href') || '', baseUrl)
    const p = fixUrlNull($el.find('img').attr('data-src'), baseUrl)
    return { title: t, url: h, posterUrl: p }
  }).get()

  const playerScript = $.html().match(/const AwsIndStreamDomain.*'(.*)';/)
  const playerDomain = playerScript?.[1]
  if (!playerDomain) return { title, url, posterUrl: poster, type: mediaType }

  const idMatch = $.html().match(/src:.'(\D+\d+)/)
  const id = idMatch?.[1]
  if (!id) return { title, url, posterUrl: poster, type: mediaType }

  const embedLink = `${playerDomain}/play/${id}`
  const streamPayload = await getDlPayload(embedLink, url, playerDomain)

  if (mediaType === 'series') {
    const folderJson = streamPayload.raw
    let episodes: any[] = []
    if (folderJson.includes('"folder"')) {
      const seasons = JSON.parse(folderJson)
      episodes = seasons.flatMap((s: any) =>
        (s.folder || []).map((ep: any) => ({
          name: ep.title,
          season: parseInt(s.id) || undefined,
          episode: parseInt(ep.episode) || undefined,
          streamData: {
            playerDomain: streamPayload.playerDomain,
            tokenKey: streamPayload.tokenKey,
            links: (ep.folder || []).map((f: any) => ({ title: f.title, id: f.id, file: f.file })),
          },
        }))
      )
    } else {
      episodes = [{ name: '1 episode', season: 1, episode: 1, streamData: streamPayload }]
    }
    return { title, url, posterUrl: poster, backgroundUrl: poster, year, plot: description, tags, rating, duration, actors: actors.length ? actors : undefined, type: 'series', episodes, trailer }
  }

  return {
    title,
    url,
    posterUrl: poster,
    backgroundUrl: poster,
    year,
    plot: description,
    tags,
    rating,
    duration,
    actors: actors.length ? actors : undefined,
    type: 'movie',
    trailer,
    streamData: streamPayload,
  }
}

export async function streams(data: any) {
  const payload = data.streamData || data
  if (!payload?.items && !payload?.links) return []
  const links = payload.items || payload.links || []
  const results: any[] = []
  for (const item of links) {
    try {
      const m3u8Content = await getM3u8(payload.playerDomain, payload.tokenKey, item.file)
      const urls = m3u8Content.match(/https?:\/\/[^\s]+/g) || []
      urls.forEach((u: string) => {
        results.push({
          name: `AllMovieLand-${lang}`,
          url: u,
          type: 'm3u8',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            Referer: payload.playerDomain,
            Origin: payload.playerDomain,
          },
        })
      })
    } catch {}
  }
  return results
}
