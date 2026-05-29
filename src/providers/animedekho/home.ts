import * as cheerio from 'cheerio'
import { http } from '@/core/utils/request'
import { HomeResponse } from '@/core/types'
import { getBaseHeaders } from './headers'
import { parseArticle } from './parser'

const CATEGORIES: [string, string][] = [
  ['/series/', 'Series'],
  ['/movie/', 'Movies'],
  ['/category/anime/', 'Anime'],
  ['/category/cartoon/', 'Cartoon'],
  ['/category/crunchyroll/', 'Crunchyroll'],
  ['/category/hindi-dub/', 'Hindi'],
  ['/category/tamil/', 'Tamil'],
  ['/category/telugu/', 'Telugu'],
]

export async function home(providerName: string, page: number = 1): Promise<HomeResponse> {
  const sections: HomeResponse['sections'] = []

  for (const [cat, name] of CATEGORIES) {
    try {
      const html = await http.get(`https://animedekho.app${cat}`, { headers: getBaseHeaders(), timeout: 10000 })
      const $ = cheerio.load(html)
      const items = $('article').map((_, el) => parseArticle(el, $, providerName)).get().filter(Boolean) as any[]
      if (items.length) sections.push({ name, items })
    } catch {}
  }

  return { provider: providerName, sections, hasNext: false }
}
