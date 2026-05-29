export interface ProviderInfo {
  id: string
  name: string
  lang: string
  type: string
  baseUrl: string
}

export interface SearchResult {
  title: string
  url: string
  posterUrl?: string
  type: 'movie' | 'series' | 'live' | 'anime' | 'cartoon'
  quality?: string
}

export interface MediaInfo {
  title: string
  url: string
  posterUrl?: string
  backgroundUrl?: string
  year?: number
  plot?: string
  tags?: string[]
  rating?: string
  duration?: number
  trailer?: string
  actors?: ActorData[]
  recommendations?: SearchResult[]
  type: 'movie' | 'series'
  episodes?: Episode[]
  streamData?: any
}

export interface ActorData {
  name: string
  image?: string
  role?: string
}

export interface Episode {
  name?: string
  season?: number
  episode?: number
  posterUrl?: string
  description?: string
  streamData: any
}

export interface StreamLink {
  name: string
  url: string
  type: string
  quality?: number
  referer?: string
  headers?: Record<string, string>
  key?: string
  kid?: string
}
