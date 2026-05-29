import * as cheerio from 'cheerio'
import { http } from '../utils/request'
import { HomeResponse, SearchResult } from '../types'
import { ensureSession, BASE_URL } from './session'
import { fixUrl, fixUrlNull } from '../utils/helpers'

const CATEGORIES: { name: string; url: string }[] = [
  { name: 'Movies', url: '/films/' },
  { name: 'Bollywood Movies', url: '/bollywood/' },
  { name: 'Hollywood Movies', url: '/hollywood/' },
  { name: 'TV Shows', url: '/series/' },
  { name: 'Cartoons', url: '/cartoon/' },
]

function parseArticle($el: cheerio.Cheerio<any>, $: cheerio.CheerioAPI): SearchResult | null {
  const title = $el.find('a.new-short__title--link > h3.new-short__title').text().trim()
  if (!title) return null

  const href = $el.find('a.new-short__title--link').attr('href') || ''
  const url = fixUrl(href, BASE_URL)

  const posterEl = $el.find('img.new-short__poster--img')
  const posterUrl = fixUrlNull(posterEl.attr('data-src'), BASE_URL)

  const checkType = $el.find('span.new-short__cats').text().toLowerCase()
  let type: 'movie' | 'series' | 'cartoon' = 'movie'
  if (checkType.includes('series')) type = 'series'
  else if (checkType.includes('cartoon')) type = 'cartoon'

  return { title, url, posterUrl, type }
}

export async function getHome(page: number = 1): Promise<HomeResponse> {
  const cookies = await ensureSession()
  const results: { name: string; items: SearchResult[] }[] = []

  for (const cat of CATEGORIES) {
    const catUrl = page === 1
      ? `${BASE_URL}${cat.url}`
      : `${BASE_URL}${cat.url}page/${page}/`

    const html = await http.get(catUrl, { cookies })
    const $ = cheerio.load(html)

    const items: SearchResult[] = []
    $('article.short-mid').each((_, el) => {
      const item = parseArticle($(el), $)
      if (item) items.push(item)
    })

    if (items.length > 0) {
      results.push({ name: cat.name, items })
    }
  }

  return { results, hasNext: true }
}
