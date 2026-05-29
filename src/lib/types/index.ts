export interface SearchResult {
  id?: string
  title: string
  url: string
  posterUrl?: string
  type: 'movie' | 'series' | 'cartoon'
}

export interface HomeSection {
  name: string
  items: SearchResult[]
}

export interface HomeResponse {
  results: HomeSection[]
  hasNext: boolean
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
  type: 'movie' | 'series' | 'cartoon'
  episodes?: EpisodeInfo[]
  streamData?: any
}

export interface EpisodeInfo {
  name: string
  season?: number
  episode?: number
  posterUrl?: string
  description?: string
  streamData: any
}

export interface ActorData {
  name: string
  image?: string
  role?: string
}

export interface StreamResult {
  name: string
  url: string
  type: 'm3u8' | 'direct' | 'mpd' | 'extractor'
  quality?: number
  referer?: string
  headers?: Record<string, string>
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
}
