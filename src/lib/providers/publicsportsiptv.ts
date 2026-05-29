import { fetchJson } from '../fetcher'

export const id = 'publicsportsiptv'
export const name = 'PublicSportsIPTV'
export const lang = 'en'
export const type = 'live'
export const baseUrl = 'https://fancode.com'

// FanCode API endpoint - in production use the actual API URL
const FANCODE_API = 'https://apiv2.fancode.com/api/v1/matches/live?page=1&per_page=50'

const REFERER = 'aHR0cHM6Ly9mYW5jb2RlLmNvbS8=' // base64 decoded: https://fancode.com/

interface Match {
  title: string
  status: string
  tournament: string
  image: string
  imageCdn: { cloudfare?: string }
  streamingCdn: {
    primaryPlaybackUrl?: string
    fancodeCdn?: string
    daiGoogleCdn?: string
    cloudfrontCdn?: string
  }
}

interface FanCodeResponse {
  matches: Match[]
}

export async function mainPage(page: number = 1) {
  try {
    const data = await fetchJson<FanCodeResponse>(FANCODE_API)
    const live = data.matches.filter((m) => m.status.toLowerCase().includes('live'))
    const upcoming = data.matches.filter((m) => m.status.toLowerCase().includes('not_started'))

    const mapMatch = (m: Match) => ({
      title: m.title,
      url: JSON.stringify({
        primaryPlaybackUrl: m.streamingCdn.primaryPlaybackUrl,
        fancodeCdn: m.streamingCdn.fancodeCdn,
        daiGoogleCdn: m.streamingCdn.daiGoogleCdn,
        cloudfrontCdn: m.streamingCdn.cloudfrontCdn,
        title: m.title,
        tournament: m.tournament,
        poster: m.imageCdn.cloudfare || m.image,
      }),
      posterUrl: m.imageCdn.cloudfare || m.image,
      type: 'live' as const,
    })

    return {
      results: [
        { name: 'Live Now', items: live.map(mapMatch) },
        { name: 'Upcoming', items: upcoming.map(mapMatch) },
      ],
    }
  } catch (e) {
    return { results: [], error: 'Failed to fetch FanCode data' }
  }
}

export async function search(query: string, page: number = 1) {
  const data = await fetchJson<FanCodeResponse>(FANCODE_API)
  return data.matches
    .filter((m) => m.title.toLowerCase().includes(query.toLowerCase()))
    .map((m) => ({
      title: m.title,
      url: JSON.stringify({
        primaryPlaybackUrl: m.streamingCdn.primaryPlaybackUrl,
        fancodeCdn: m.streamingCdn.fancodeCdn,
        daiGoogleCdn: m.streamingCdn.daiGoogleCdn,
        cloudfrontCdn: m.streamingCdn.cloudfrontCdn,
        title: m.title,
        tournament: m.tournament,
        poster: m.imageCdn.cloudfare || m.image,
      }),
      posterUrl: m.imageCdn.cloudfare || m.image,
      type: 'live' as const,
    }))
}

export async function info(url: string) {
  const parsed = JSON.parse(url)
  return {
    title: parsed.title || 'PublicSportsIPTV',
    url,
    posterUrl: parsed.poster || 'https://www.fancode.com/skillup-uploads/fc-web/home-page-new-arc/hero-image/v1/hero-image-dweb-v4.png',
    plot: parsed.tournament || 'FanCode - Sports streaming service',
    type: 'live' as const,
    streamData: parsed,
  }
}

export async function streams(data: any) {
  const parsed = typeof data === 'string' ? JSON.parse(data) : data
  const urls = [
    parsed.primaryPlaybackUrl,
    parsed.fancodeCdn,
    parsed.daiGoogleCdn,
    parsed.cloudfrontCdn,
  ].filter(Boolean)

  return [...new Set(urls)].map((url: string, index: number) => ({
    name: `${name} ${index + 1}`,
    url,
    type: url.includes('.mpd') ? 'dash' : 'hls',
    quality: 1080,
    referer: Buffer.from(REFERER, 'base64').toString('ascii'),
  }))
}
