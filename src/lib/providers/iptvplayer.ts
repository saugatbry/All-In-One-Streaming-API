import { fetchText } from '../fetcher'

export const id = 'iptvplayer'
export const name = 'IPTV Player'
export const lang = 'hi'
export const type = 'live'
export const baseUrl = 'https://raw.githubusercontent.com/phisher98/TVVVV/main/15APR2024.m3u'

interface PlaylistItem {
  url: string
  title: string
  tvgLogo?: string
  groupTitle?: string
  key?: string
  keyid?: string
  referrer?: string
  userAgent?: string
}

function parseM3U(content: string): PlaylistItem[] {
  const lines = content.split(/\r?\n/)
  if (!lines.length || !lines[0].startsWith('#EXTM3U')) return []

  const items: PlaylistItem[] = []
  let currentTitle = ''
  let currentTvgLogo: string | undefined
  let currentGroupTitle: string | undefined
  let currentKey: string | undefined
  let currentKeyid: string | undefined
  let currentReferrer: string | undefined
  let currentUserAgent: string | undefined

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    if (trimmed.startsWith('#EXTINF:')) {
      const attrMatch = trimmed.match(/#EXTINF:-?\d+\s+(.*?),(.*)/)
      if (attrMatch) {
        const attrs = attrMatch[1]
        currentTitle = attrMatch[2].trim()
        currentTvgLogo = attrs.match(/tvg-logo="([^"]*)"/)?.[1] || undefined
        currentGroupTitle = attrs.match(/group-title="([^"]*)"/)?.[1] || undefined
        currentKey = attrs.match(/\bkey="([^"]*)"/)?.[1] || undefined
        currentKeyid = attrs.match(/\bkeyid="([^"]*)"/)?.[1] || undefined
      }
    } else if (trimmed.startsWith('#EXTVLCOPT:')) {
      const optVal = trimmed.slice('#EXTVLCOPT:'.length)
      const eqIdx = optVal.indexOf('=')
      if (eqIdx !== -1) {
        const opt = optVal.slice(0, eqIdx).trim().toLowerCase()
        const val = optVal.slice(eqIdx + 1).trim()
        if (opt === 'http-referrer') currentReferrer = val
        else if (opt === 'http-user-agent') currentUserAgent = val
      }
    } else if (!trimmed.startsWith('#')) {
      let url = trimmed
      let key: string | undefined = currentKey
      let keyid: string | undefined = currentKeyid
      let referrer: string | undefined = currentReferrer
      let userAgent: string | undefined = currentUserAgent

      const pipeIdx = url.indexOf('|')
      if (pipeIdx !== -1) {
        const paramsStr = url.slice(pipeIdx + 1)
        url = url.slice(0, pipeIdx)
        const params = new URLSearchParams(paramsStr.replace(/&/g, '&'))
        if (params.has('key')) key = params.get('key')!
        if (params.has('keyid')) keyid = params.get('keyid')!
        if (params.has('Referer')) referrer = params.get('Referer')!
        if (params.has('User-Agent')) userAgent = params.get('User-Agent')!
      }

      items.push({
        url,
        title: currentTitle,
        tvgLogo: currentTvgLogo,
        groupTitle: currentGroupTitle,
        key,
        keyid,
        referrer,
        userAgent,
      })
    }
  }

  return items
}

export async function mainPage(page: number = 1) {
  const content = await fetchText(baseUrl)
  const items = parseM3U(content)

  const groups = new Map<string, PlaylistItem[]>()
  for (const item of items) {
    const group = item.groupTitle || 'Uncategorized'
    if (!groups.has(group)) groups.set(group, [])
    groups.get(group)!.push(item)
  }

  const results = Array.from(groups.entries()).map(([name, groupItems]) => ({
    name,
    items: groupItems.map((item) => ({
      title: item.title,
      url: item.url,
      posterUrl: item.tvgLogo,
      type: 'live' as const,
      streamData: {
        url: item.url,
        key: item.key,
        keyid: item.keyid,
        headers: {
          ...(item.referrer ? { Referer: item.referrer } : {}),
          ...(item.userAgent ? { 'User-Agent': item.userAgent } : {}),
        },
      },
    })),
  }))

  return { results }
}

export async function search(query: string, page: number = 1) {
  const content = await fetchText(baseUrl)
  const items = parseM3U(content)
  const q = query.toLowerCase()

  return items
    .filter((item) => item.title.toLowerCase().includes(q))
    .map((item) => ({
      title: item.title,
      url: item.url,
      posterUrl: item.tvgLogo,
      type: 'live' as const,
      streamData: {
        url: item.url,
        key: item.key,
        keyid: item.keyid,
        headers: {
          ...(item.referrer ? { Referer: item.referrer } : {}),
          ...(item.userAgent ? { 'User-Agent': item.userAgent } : {}),
        },
      },
    }))
}

export async function info(url: string) {
  const data = JSON.parse(url)
  return {
    title: data.title || '',
    poster: data.posterUrl || data.tvgLogo || '',
    plot: data.groupTitle ? `Channel: ${data.groupTitle}` : 'Live TV Channel',
    type: 'live' as const,
  }
}

export async function streams(data: any) {
  const url = typeof data === 'string' ? data : data?.url || data?.streamData?.url || ''
  const key = data?.key || data?.streamData?.key
  const keyid = data?.keyid || data?.streamData?.keyid

  if (url.includes('.mpd')) {
    return [{
      name: 'DASH',
      url,
      type: 'drm' as const,
      ...(key && keyid ? { key, kid: keyid } : {}),
    }]
  }

  if (url.includes('&e=.m3u')) {
    return [{
      name: 'M3U8',
      url,
      type: 'm3u8' as const,
    }]
  }

  return [{
    name: 'Stream',
    url,
    type: 'generic' as const,
  }]
}
