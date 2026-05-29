import * as cheerio from 'cheerio'
import { http } from '@/core/utils/request'
import { HomeResponse, SearchResult } from '@/core/types'
import { getBaseHeaders } from './headers'
import { parseArticle } from './parser'

const CATEGORIES: [string, string][] = [
  ['', 'Home'],
  ['category/movie', 'Movies'],
  ['category/series', 'Series'],
  ['category/genres/action', 'Action'],
  ['category/drama', 'Drama'],
  ['category/romance', 'Romance'],
  ['category/thriller', 'Thriller'],
]

export async function home(providerName: string, page: number = 1): Promise<HomeResponse> {
  const sections: HomeResponse['sections'] = []

  for (const [cat, name] of CATEGORIES) {
    try {
      const url = `${cat ? 'https://www.animedubhindi.me/' + cat : 'https://www.animedubhindi.me'}`
      const html = await http.get(url, { headers: getBaseHeaders(), timeout: 10000 })
      const $ = cheerio.load(html)
      const items = $('article').map((_, el) => parseArticle(el, $, providerName)).get().filter(Boolean) as SearchResult[]
      if (items.length) sections.push({ name, items })
    } catch {}
  }

  return { provider: providerName, sections, hasNext: false }
}
