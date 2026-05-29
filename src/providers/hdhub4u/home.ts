import * as cheerio from 'cheerio'
import { http } from '@/core/utils/request'
import { HomeResponse } from '@/core/types'
import { getBaseHeaders, getDomainUrl } from './headers'
import { parseHomeItem } from './parser'

const CATEGORIES: [string, string][] = [
  ['', 'Latest'],
  ['category/bollywood-movies/', 'Bollywood'],
  ['category/hollywood-movies/', 'Hollywood'],
  ['category/hindi-dubbed/', 'Hindi Dubbed'],
  ['category/south-hindi-movies/', 'South Hindi Dubbed'],
  ['category/web-series/', 'Web Series'],
]

export async function home(providerName: string, page: number = 1): Promise<HomeResponse> {
  const mainUrl = await getDomainUrl()
  const sections: HomeResponse['sections'] = []

  for (const [cat, name] of CATEGORIES) {
    try {
      const url = `${mainUrl}/${cat}page/${page}/`.replace(/\/\/page/g, '/page')
      const html = await http.get(url, { headers: getBaseHeaders(), timeout: 10000 })
      const $ = cheerio.load(html)
      const items = $('.recent-movies > li.thumb').map((_, el) => parseHomeItem(el, $, providerName)).get().filter(Boolean) as any[]
      if (items.length) sections.push({ name, items })
    } catch {}
  }

  return { provider: providerName, sections, hasNext: page < 5 }
}
