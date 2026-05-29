import * as cheerio from 'cheerio'
import { SearchResult } from '@/core/types'

export function parseArticle($el: any, $: cheerio.CheerioAPI, providerName: string): SearchResult | null {
  const href = $($el).find('a.lnk-blk').attr('href')
  const title = $($el).find('header h2').text()
  let posterUrl = $($el).find('div figure img').attr('src')
  if (posterUrl?.includes('data:image')) {
    posterUrl = $($el).find('div figure img').attr('data-lazy-src')
  }
  if (!href || !title) return null
  return { provider: providerName, id: href, title, type: 'anime', poster: posterUrl || undefined }
}
