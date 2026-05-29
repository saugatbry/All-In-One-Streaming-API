import { http } from '@/core/utils/request'
import { SearchResult } from '@/core/types'
import { getBaseHeaders } from './headers'
import { SearchResponse, parseSearchDoc } from './parser'

export async function search(providerName: string, query: string, page: number = 1): Promise<SearchResult[]> {
  const searchUrl = `https://search.hdhub4u.glass/collections/post/documents/search?q=${encodeURIComponent(query)}&query_by=post_title,category&query_by_weights=4,2&sort_by=sort_by_date:desc&limit=15&highlight_fields=none&use_cache=true&page=${page}`
  try {
    const json = await http.json<SearchResponse>(searchUrl, { headers: getBaseHeaders(), referer: 'https://hdhub4u.rehab' })
    return (json.hits || []).map(hit => parseSearchDoc(hit.document, providerName))
  } catch {
    return []
  }
}
