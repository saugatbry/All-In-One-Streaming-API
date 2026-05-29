import * as cheerio from 'cheerio'
import { SearchResult } from '@/core/types'

export function parseHomeItem($el: any, $: cheerio.CheerioAPI, providerName: string): SearchResult | null {
  const titleText = $($el).find('figcaption:nth-child(2) > a:nth-child(1) > p:nth-child(1)').text()
  const url = $($el).find('figure:nth-child(1) > a:nth-child(2)').attr('href')
  const poster = $($el).find('figure:nth-child(1) > img:nth-child(1)').attr('src') || undefined
  if (!titleText || !url) return null
  const title = cleanTitle(titleText)
  return { provider: providerName, id: url, title, type: 'movie', poster }
}

function cleanTitle(raw: string): string {
  const name = raw.split('(')[0].trim().replace(/\s+/g, ' ')
    .replace(/^./, c => c.toUpperCase())
  const season = raw.match(/Season\s*\d+/i)?.[0] || ''
  const year = raw.match(/\b(19|20)\d{2}\b/)?.[0] || ''
  const parts = [name]
  if (season) parts.push(`(${season.charAt(0).toUpperCase() + season.slice(1)})`)
  if (year) parts.push(`(${year})`)
  return parts.join(' ')
}

export interface SearchDoc {
  post_title: string
  permalink: string
  post_thumbnail: string
  category: string[]
}

export interface SearchHit {
  document: SearchDoc
}

export interface SearchResponse {
  hits: SearchHit[]
}

export function parseSearchDoc(doc: SearchDoc, providerName: string): SearchResult {
  return {
    provider: providerName,
    id: doc.permalink,
    title: doc.post_title,
    type: doc.category?.some(c => c.toLowerCase().includes('series') || c.toLowerCase().includes('web')) ? 'series' : 'movie',
    poster: doc.post_thumbnail || undefined,
  }
}
