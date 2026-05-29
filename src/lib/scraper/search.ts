import * as cheerio from 'cheerio'
import { http } from '../utils/request'
import { SearchResult } from '../types'
import { ensureSession, BASE_URL } from './session'
import { fixUrl, fixUrlNull } from '../utils/helpers'

export async function search(query: string): Promise<SearchResult[]> {
  const cookies = await ensureSession()

  const body = new URLSearchParams({
    do: 'search',
    subaction: 'search',
    search_start: '0',
    full_search: '0',
    result_from: '1',
    story: query,
  })

  const html = await http.post(`${BASE_URL}/index.php?do=search`, body, {
    referer: `${BASE_URL}/`,
    cookies,
  })

  const $ = cheerio.load(html)
  const results: SearchResult[] = []

  $('article.short-mid').each((_, el) => {
    const $el = $(el)
    const title = $el.find('a.new-short__title--link > h3.new-short__title').text().trim()
    if (!title) return

    const href = $el.find('a.new-short__title--link').attr('href') || ''
    const url = fixUrl(href, BASE_URL)

    const posterUrl = fixUrlNull(
      $el.find('img.new-short__poster--img').attr('data-src'),
      BASE_URL
    )

    const checkType = $el.find('span.new-short__cats').text().toLowerCase()
    let type: 'movie' | 'series' | 'cartoon' = 'movie'
    if (checkType.includes('series')) type = 'series'
    else if (checkType.includes('cartoon')) type = 'cartoon'

    results.push({ title, url, posterUrl, type })
  })

  return results
}
