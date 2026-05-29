import * as cheerio from 'cheerio'
import { SearchResult } from '@/core/types'
import { BASE_URL } from './headers'

export function parseArticle($el: any, $: cheerio.CheerioAPI, providerName: string): SearchResult | null {
  const title = $($el).find('h2 a').text().split('(')[0].trim()
  const href = $($el).find('h2 a').attr('href') || ''
  const posterUrl = $($el).find('img').attr('src') || undefined
  if (!title || !href) return null
  const url = href.startsWith('http') ? href : `${BASE_URL.replace(/\/+$/, '')}/${href.replace(/^\/+/, '')}`
  return { provider: providerName, id: url, title: title.charAt(0).toUpperCase() + title.slice(1), type: 'movie', poster: posterUrl }
}
