import * as cheerio from 'cheerio'
import { http } from '@/core/utils/request'
import { SearchResult } from '@/core/types'
import { getBaseHeaders } from './headers'
import { parseArticle } from './parser'

export async function search(providerName: string, query: string): Promise<SearchResult[]> {
  const html = await http.get(`https://www.animedubhindi.me/?s=${encodeURIComponent(query)}`, { headers: getBaseHeaders() })
  const $ = cheerio.load(html)
  return $('article').map((_, el) => parseArticle(el, $, providerName)).get().filter(Boolean) as SearchResult[]
}
