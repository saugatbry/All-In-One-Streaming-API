export type ContentType = 'movie' | 'series' | 'anime' | 'cartoon' | 'live' | 'asian_drama'

export interface SearchResult {
  provider: string
  id: string
  title: string
  type: ContentType
  poster?: string
  year?: number
}

export interface HomeSection {
  name: string
  items: SearchResult[]
}

export interface HomeResponse {
  provider: string
  sections: HomeSection[]
  hasNext: boolean
}

export interface EpisodeInfo {
  name: string
  season?: number
  episode?: number
  thumbnail?: string
  runtime?: number
  id: string
}

export interface InfoResponse {
  provider: string
  id: string
  title: string
  type: ContentType
  description?: string
  genres?: string[]
  rating?: number
  year?: number
  poster?: string
  banner?: string
  cast?: { name: string; image?: string; role?: string }[]
  episodes?: EpisodeInfo[]
  trailer?: string
  duration?: number
}

export interface StreamSource {
  server: string
  quality: string
  type: 'hls' | 'mp4' | 'dash' | 'direct'
  url: string
  headers?: Record<string, string>
}

export interface Subtitle {
  lang: string
  url: string
}

export interface WatchResponse {
  status: 'ok' | 'error'
  provider: string
  type: ContentType
  streams: StreamSource[]
  subtitles: Subtitle[]
  error?: string
}

export interface ProviderManifest {
  id: string
  name: string
  lang: string
  type: ContentType[]
  baseUrl: string
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
}
