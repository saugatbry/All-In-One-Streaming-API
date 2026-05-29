import * as cheerio from 'cheerio'
import { fetchText, fetchDocument, fixUrl, fixUrlNull } from '../fetcher'

export const id = 'multimovies'
export const name = 'MultiMovies'
export const lang = 'hi'
export const type = 'movie'
export const baseUrl = 'https://multimovies.autos'

export async function mainPage(page: number = 1) {
  const categories = [
    'trending/', 'genre/bollywood-movies/', 'genre/hollywood/', 'genre/south-indian/',
    'genre/punjabi/', 'genre/amazon-prime/', 'genre/disney-hotstar/', 'genre/jio-ott/',
    'genre/netflix/', 'genre/sony-liv/', 'genre/k-drama/', 'genre/zee-5/',
    'genre/anime-hindi/', 'genre/anime-movies/', 'genre/cartoon-network/',
    'genre/disney-channel/', 'genre/hungama/',
  ]
  const results: any[] = []
  for (const cat of categories) {
    const url = page === 1 ? `${baseUrl}/${cat}` : `${baseUrl}/${cat}page/${page}/`
    const html = await fetchText(url)
    const $ = cheerio.load(html)
    const isMovieCat = cat.includes('/movies')
    const selector = isMovieCat ? '#archive-content > article' : 'div.items > article'
    const items = $(selector).map((_, el) => {
      const $el = $(el)
      const title = $el.find('div.data > h3 > a').text().trim()
      const href = fixUrl($el.find('div.data > h3 > a').attr('href') || '', baseUrl)
      const posterUrl = fixUrlNull($el.find('div.poster > img').attr('data-src') || $el.find('div.poster > img').attr('src'), baseUrl)
      const quality = $el.find('div.poster > div.mepo > span').text()
      const type = href.includes('Movie') ? 'movie' : 'series'
      return { title, url: href, posterUrl, quality: quality || undefined, type }
    }).get()
    if (items.length) results.push({ name: cat.replace(/genre\/|-/g, ' ').replace(/\//g, '').trim(), items })
  }
  return { results }
}

export async function search(query: string, page: number = 1) {
  const html = await fetchText(`${baseUrl}/?s=${encodeURIComponent(query)}`)
  const $ = cheerio.load(html)
  return $('div.result-item').map((_, el) => {
    const $el = $(el)
    const title = $el.find('article > div.details > div.title > a').text().trim()
    const href = fixUrl($el.find('article > div.details > div.title > a').attr('href') || '', baseUrl)
    const posterUrl = fixUrlNull($el.find('article > div.image > div.thumbnail > a > img').attr('src'), baseUrl)
    const typeText = $el.find('article > div.image > div.thumbnail > a > span').text()
    const type = typeText.includes('Movie') ? 'movie' : 'series'
    return { title, url: href, posterUrl, type }
  }).get()
}

async function getEmbed(postId: string, nume: string, referUrl: string) {
  const body = new URLSearchParams({
    action: 'doo_player_ajax',
    post: postId,
    nume: nume,
    type: 'movie',
  })
  return fetchText(`${baseUrl}/wp-admin/admin-ajax.php`, {
    method: 'POST',
    body,
    referer: referUrl,
  })
}

export async function info(url: string) {
  const html = await fetchText(url)
  const $ = cheerio.load(html)
  const titleL = $('div.sheader > div.data > h1').text().trim()
  const title = titleL
  const poster = fixUrlNull($('div.poster img').attr('src'), baseUrl)
  const bgposter = fixUrlNull($('div.g-item a').attr('href'), baseUrl)
  const tags = $('div.sgeneros > a').map((_, el) => $(el).text()).get()
  const yearText = $('span.date').text()
  const year = parseInt(yearText.split(',').pop()?.trim() || '')
  const description = $('div#info div.wp-content p').first().text().trim()
  const type = url.includes('tvshows') ? 'series' : 'movie'
  const rating = $('span.dt_rating_vgs').text()
  const durationText = $('span.runtime').text()
  const duration = parseInt(durationText.replace('Min.', '').trim()) || undefined
  const actors = $('div.person').map((_, el) => {
    const $el = $(el)
    return {
      name: $el.find('div.data > div.name > a').text(),
      image: $el.find('div.img > a > img').attr('src'),
      role: $el.find('div.data > div.caracter').text(),
    }
  }).get()

  const recommendations = $('div#dtw_content_related-2 article').map((_, el) => {
    const $el = $(el)
    const t = $el.find('div.data > h3 > a').text().trim()
    const h = fixUrl($el.find('div.data > h3 > a').attr('href') || '', baseUrl)
    const p = fixUrlNull($el.find('div.poster > img').attr('data-src') || $el.find('div.poster > img').attr('src'), baseUrl)
    return { title: t, url: h, posterUrl: p }
  }).get()

  if (type === 'series') {
    const episodes: any[] = []
    $('#seasons ul.episodios').each((seasonNum, ul) => {
      $(ul).find('li').each((epNum, li) => {
        const $li = $(li)
        episodes.push({
          name: $li.find('div.episodiotitle > a').text(),
          season: seasonNum + 1,
          episode: epNum + 1,
          posterUrl: fixUrlNull($li.find('div.imagen > img').attr('data-src') || $li.find('div.imagen > img').attr('src'), baseUrl),
          streamData: $li.find('div.episodiotitle > a').attr('href'),
        })
      })
    })
    return { title, url, posterUrl: poster?.trim(), backgroundUrl: bgposter || poster, year, plot: description, tags, rating, duration, actors: actors.length ? actors : undefined, type: 'series', episodes, recommendations }
  }

  return {
    title, url, posterUrl: poster?.trim(), backgroundUrl: bgposter || poster, year, plot: description,
    tags, rating, duration, actors: actors.length ? actors : undefined, type: 'movie', recommendations,
    streamData: url,
  }
}

export async function streams(data: any) {
  const pageUrl = typeof data === 'string' ? data : data.streamData
  if (!pageUrl) return []
  const html = await fetchText(pageUrl)
  const $ = cheerio.load(html)
  const results: any[] = []
  const items: { post: string; nume: string; type: string }[] = []
  $('ul#playeroptionsul li').each((_, li) => {
    const $li = $(li)
    items.push({
      post: $li.attr('data-post') || '',
      nume: $li.attr('data-nume') || '',
      type: $li.attr('data-type') || '',
    })
  })
  for (const item of items) {
    if (item.nume.includes('trailer')) continue
    try {
      const body = new URLSearchParams({
        action: 'doo_player_ajax',
        post: item.post,
        nume: item.nume,
        type: item.type,
      })
      const resp = await fetchText(`${baseUrl}/wp-admin/admin-ajax.php`, {
        method: 'POST',
        body,
        referer: baseUrl,
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
      })
      const srcMatch = resp.match(/SRC="(https?:[^"]+)"/i)
      let link = srcMatch?.[1]?.replace(/\t/g, '')?.trim()
      if (!link) {
        link = resp.split('"')[1]?.trim()
      }
      if (link && !link.includes('youtube')) {
        if (link.includes('deaddrive.xyz')) {
          const dlHtml = await fetchText(link)
          const $dl = cheerio.load(dlHtml)
          $dl('ul.list-server-items > li').each((_, li) => {
            const server = $dl(li).attr('data-video')
            if (server) results.push({ url: server, type: 'extractor', referer: baseUrl })
          })
        } else {
          results.push({ url: link, type: 'extractor', referer: baseUrl })
        }
      }
    } catch {}
  }
  return results
}
