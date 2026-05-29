import * as cheerio from 'cheerio'
import { fetchText, fixUrl, fixUrlNull } from '../fetcher'

export const id = 'animedubhindi'
export const name = 'AnimeDubHindi'
export const lang = 'hi'
export const type = 'anime'
export const baseUrl = 'https://www.animedubhindi.me'

export async function mainPage(page: number = 1) {
  const categories = [
    { name: 'Home', url: '' },
    { name: 'Movies', url: 'category/movie' },
    { name: 'Series', url: 'category/series' },
    { name: 'Action', url: 'category/genres/action' },
    { name: 'Drama', url: 'category/drama' },
    { name: 'Romance', url: 'category/romance' },
    { name: 'Thriller', url: 'category/thriller' },
  ]
  const results: any[] = []
  for (const cat of categories) {
    const html = await fetchText(`${baseUrl}/${cat.url}`)
    const $ = cheerio.load(html)
    const items = $('article').map((_, el) => {
      const $el = $(el)
      const title = $el.find('h2 a').text().replace(/\([^)]*$/, '').trim()
      const href = fixUrl($el.find('h2 a').attr('href') || '', baseUrl)
      const posterUrl = fixUrlNull($el.find('img').attr('src'), baseUrl)
      return { title, url: href, posterUrl, type: 'movie' }
    }).get()
    results.push({ name: cat.name, items })
  }
  return { results }
}

export async function search(query: string, page: number = 1) {
  const html = await fetchText(`${baseUrl}/?s=${encodeURIComponent(query)}`)
  const $ = cheerio.load(html)
  return $('article').map((_, el) => {
    const $el = $(el)
    const title = $el.find('h2 a').text().replace(/\([^)]*$/, '').trim()
    const href = fixUrl($el.find('h2 a').attr('href') || '', baseUrl)
    const posterUrl = fixUrlNull($el.find('img').attr('src'), baseUrl)
    return { title, url: href, posterUrl, type: 'movie' }
  }).get()
}

export async function info(url: string) {
  const html = await fetchText(url)
  const $ = cheerio.load(html)
  const infoMap: Record<string, string> = {}
  $('ul.wp-block-list li').each((_, el) => {
    const $el = $(el)
    const key = $el.find('strong').text().replace(':', '').trim()
    const value = $el.contents().last().text().trim()
    if (key) infoMap[key] = value
  })
  const iframe = $('div.wp-block-button a').attr('href') || ''
  const audio = (infoMap['Audio Tracks'] || '').split('|').map((s: string) => s.trim()).filter(Boolean)
  const rawTitle = $('meta[property=og:title]').attr('content') || ''
  const title = rawTitle.replace(/\([^)]*$/, '').trim()
  const description = $('div.entry-content p').first().contents().first().text().trim() + '\n' + audio.join(', ')
  const backgroundPoster = $('div.entry-content img').attr('src')
  const rating = (infoMap['MAL Rating'] || infoMap['IMDb Rating'] || '').split('/')[0]
  const genres = (infoMap['Genres'] || '').split('|').map((s: string) => s.trim()).filter(Boolean)
  const isMovie = rawTitle.toLowerCase().includes('movie')

  if (!isMovie && iframe) {
    const epHtml = await fetchText(iframe)
    const $ep = cheerio.load(epHtml)
    const episodes: any[] = []

    $ep('div.wp-block-group').each((_, block) => {
      const $block = $ep(block)
      const epText = $block.find('h2:contains(Episode)').text()
      const epNum = parseInt(epText.replace('Episode:', '').trim())
      const links: any[] = []
      $block.find('a').each((_, a) => {
        const href = $ep(a).attr('href')
        if (href && (href.includes('hubcloud') || href.includes('gdflix'))) {
          links.push({ name: $ep(a).text() || 'Link', url: href })
        }
      })
      if (links.length) {
        episodes.push({ name: epNum ? `Episode ${epNum}` : epText, episode: epNum || undefined, streamData: links })
      }
    })

    $ep('div.pro-ep-card').each((_, card) => {
      const $card = $ep(card)
      const epText = $card.find('.pro-ep-title').text()
      const epNum = parseInt(epText.replace('Episode:', '').trim())
      const links: any[] = []
      $card.find('.pro-btn-group a').each((_, a) => {
        const href = $ep(a).attr('href')
        if (href && (href.includes('hubcloud') || href.includes('gdflix'))) {
          links.push({ name: $ep(a).text() || 'Link', url: href })
        }
      })
      if (links.length) {
        episodes.push({ name: epNum ? `Episode ${epNum}` : epText, episode: epNum || undefined, streamData: links })
      }
    })

    return {
      title, url, posterUrl: backgroundPoster, plot: description, tags: genres, rating,
      type: 'series', episodes,
    }
  }

  if (iframe) {
    const movieHtml = await fetchText(iframe)
    const $m = cheerio.load(movieHtml)
    const links: any[] = []

    $m('div.entry-content h4').each((_, h4) => {
      const $h4 = $m(h4)
      const quality = $h4.contents().first().text().split('[Size')[0].trim()
      $h4.find('a').each((_, a) => {
        const url = $m(a).attr('href')
        if (url && (url.includes('hubcloud') || url.includes('gdflix'))) {
          links.push({ name: `${$m(a).text()} ${quality}`.trim(), url })
        }
      })
    })

    $m('div.pro-ep-card .pro-quality-wrapper').each((_, sec) => {
      const $sec = $m(sec)
      const quality = $sec.find('.pro-ep-quality').text().replace(/[\[\]]/g, '')
      $sec.find('.pro-btn-group a').each((_, a) => {
        const url = $m(a).attr('href')
        if (url && (url.includes('hubcloud') || url.includes('gdflix'))) {
          links.push({ name: `${$m(a).text()} ${quality}`.trim(), url })
        }
      })
    })

    return {
      title, url, posterUrl: backgroundPoster, plot: description, tags: genres, rating,
      type: 'movie', streamData: links,
    }
  }

  return { title, url, posterUrl: backgroundPoster, plot: description, type: 'movie' }
}

export async function streams(data: any) {
  const links = Array.isArray(data) ? data : (data.streamData || [])
  return links.map((item: any) => ({
    name: item.name || 'Link',
    url: item.url,
    type: 'extractor',
  }))
}
