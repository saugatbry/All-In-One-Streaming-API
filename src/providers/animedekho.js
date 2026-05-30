import * as cheerio from 'cheerio';
import { fetchPage, fetchJSON, postPage } from '../utils/request.js';
import { getBaseUrl, getQuality, cleanTitle, base64Decode, base64Encode } from '../utils/helpers.js';
import { resolveExtractors } from '../extractors/index.js';

const BASE_URL = 'https://animedekho.app';

function toSlug(url) {
  return url.replace(/\/+$/, '').split('/').filter(Boolean).pop() || url;
}

// ========== HOME ==========

export async function getHome() {
  const html = await fetchPage(`${BASE_URL}/home/`);
  const $ = cheerio.load(html);
  const items = [];
  const seen = new Set();

  $('.swiper-slide article.post').each((_, el) => {
    const $el = $(el);
    const href = $el.find('a').first().attr('href');
    if (!href || seen.has(href)) return;
    seen.add(href);
    const title = $el.find('h2.entry-title').text().trim();
    const bgStyle = $el.find('div.bg').attr('style') || '';
    const poster = bgStyle.match(/background-image:\s*url\(['"]?([^'")\s]+)['"]?\)/)?.[1] || '';
    const slug = toSlug(href);
    if (title && slug) items.push({ id: slug, title, type: 'anime', poster: poster || undefined });
  });

  return { success: true, results: items.slice(0, 30) };
}

// ========== SEARCH ==========

export async function searchAnimeDekho(query) {
  const html = await fetchPage(`${BASE_URL}/?s=${encodeURIComponent(query)}`);
  const $ = cheerio.load(html);
  const results = [];
  $('ul[data-results] article').each((_, el) => {
    const href = $(el).find('a.lnk-blk').attr('href');
    const title = $(el).find('h2.entry-title').text().trim();
    let poster = $(el).find('div.post-thumbnail figure img').attr('src');
    if (!poster || poster.includes('data:image')) {
      poster = $(el).find('div.post-thumbnail figure img').attr('data-lazy-src');
    }
    if (href && title) {
      results.push({ provider: 'animedekho', id: toSlug(href), title, type: 'anime', poster: poster || undefined });
    }
  });
  return results;
}

// ========== INFO ==========

const PER_PAGE = 50;

export async function infoAnimeDekho(id, page = 1) {
  const pageUrl = `${BASE_URL}/${id}/`;
  const html = await fetchPage(pageUrl);
  const $ = cheerio.load(html);

  const title = ($('h1.entry-title').text().trim() || $('meta[property=og:title]').attr('content') || '')
    .replace(/\s*[–\-|]\s*Watch Online\s*\|?\s*AnimeDekho\s*$/i, '')
    .replace(/\s*\|\s*AnimeDekho\s*$/i, '')
    .replace(/^Watch Online\s+/i, '')
    .replace(/\s*Movie\s*\(Hindi Dubbed\)\s*–?\s*/i, '')
    .replace(/\s*Movie in Hindi Dubbed Free/i, '')
    .trim();
  let poster = $('div.post-thumbnail figure img').attr('src') || $('meta[property=og:image]').attr('content') || undefined;
  if (poster && poster.includes('AnimeDekho-Logo')) poster = undefined;
  const plot = $('div.entry-content p').first().text().trim() || $('meta[property=og:description]').attr('content') || $('meta[name=twitter:description]').attr('content') || undefined;
  const yearStr = $('span.year').first().text().trim() || $('meta[property=og:updated_time]').attr('content')?.split('-')[0];
  const year = yearStr ? parseInt(yearStr) : undefined;
  const seasonCount = $('div.seasons-bx').length;
  const hasSeasons = seasonCount > 0 || $('ul.seasons-lst li').length > 0;

  if (!hasSeasons) {
    return { provider: 'animedekho', id, title, type: 'movie', poster, description: plot, year };
  }

  // Collect all episodes grouped by season
  const allEpisodes = [];
  const seasonNames = [];

  $('div.seasons-bx').each((_, seasonBox) => {
    const $box = $(seasonBox);
    const seasonText = $box.contents().first().text().trim();
    const seasonNum = parseInt(seasonText.match(/Season\s*(\d+)/i)?.[1]) || (seasonNames.length + 1);
    seasonNames.push(seasonText);

    $box.find('ul.seasons-lst li').each((_, li) => {
      const $li = $(li);
      const epSpanText = $li.find('h3.title > span').text();
      const name = $li.find('h3.title').clone().children().remove().end().text().trim() || 'Episode';
      const href = $li.find('a').attr('href');
      const epPoster = $li.find('div > div > figure > img').attr('src') || undefined;
      const epSpan = $li.find('h3.title > span').text();
      const epNum = parseInt(epSpan.split('-E')[1]?.split('-')[0] || epSpan.match(/E(\d+)/)?.[1]) || undefined;
      if (href) {
        const epData = base64Encode(JSON.stringify({ url: href, mediaType: 2 }));
        allEpisodes.push({ name, season: seasonNum, episode: epNum, id: epData, thumbnail: epPoster });
      }
    });
  });

  // Paginate episodes
  const totalEpisodes = allEpisodes.length;
  const totalPages = Math.ceil(totalEpisodes / PER_PAGE);
  const start = (page - 1) * PER_PAGE;
  const episodes = allEpisodes.slice(start, start + PER_PAGE);
  const morePage = page < totalPages;

  return {
    provider: 'animedekho', id, title, type: 'anime',
    poster, description: plot, year,
    seasons: seasonNames,
    totalEpisodes,
    currentPage: page,
    totalPages,
    more_page: morePage,
    episodes,
  };
}

// ========== WATCH (loadLinks equivalent) ==========

export async function watchAnimeDekho(episodeId) {
  let media;
  try {
    media = JSON.parse(base64Decode(episodeId));
  } catch {
    return { sources: [], subtitles: [], error: 'Invalid episode data' };
  }

  const url = media.url;
  const mediaType = media.mediaType ?? 2;
  if (!url) return { sources: [], subtitles: [], error: 'No URL' };

  const allSources = [];
  const seenUrls = new Set();
  const subtitles = [];

  function addSource(server, streamUrl, quality, type, headers) {
    if (seenUrls.has(streamUrl)) return;
    seenUrls.add(streamUrl);
    allSources.push({ url: streamUrl, quality: quality ? `${quality}p` : 'auto', server, type: type || 'direct', headers: headers || undefined });
  }

  function addSubtitle(lang, subUrl) {
    subtitles.push({ lang, url: subUrl });
  }

  // Step 1: VidStream cookie approach
  try {
    const cookieHtml = await fetchPage(url, { headers: { Cookie: 'toronites_server=vidstream', Referer: BASE_URL } });
    const $ = cheerio.load(cookieHtml);
    const iframePromises = [];
    $('iframe.serversel[src]').each((_, el) => {
      const src = $(el).attr('src');
      if (!src) return;
      iframePromises.push((async () => {
        try {
          const innerHtml = await fetchPage(src);
          const $$ = cheerio.load(innerHtml);
          const innerSrc = $$('iframe[src]').attr('src');
          if (innerSrc) {
            const results = await resolveExtractors([innerSrc], addSource, addSubtitle);
          }
        } catch (e) {}
      })());
    });
    await Promise.all(iframePromises);
  } catch (e) {}

  // Step 2: trdekho approach
  try {
    const cleanHtml = await fetchPage(url, { headers: { Referer: BASE_URL } });
    const $ = cheerio.load(cleanHtml);
    const bodyClass = $('body').attr('class') || '';
    const termMatch = bodyClass.match(/(?:term|postid)-(\d+)/);
    const term = termMatch?.[1];

    if (term) {
      const trPromises = [];
      for (let i = 0; i <= 10; i++) {
        trPromises.push((async () => {
          try {
            const trHtml = await fetchPage(`${BASE_URL}/?trdekho=${i}&trid=${term}&trtype=${mediaType}`);
            const $$ = cheerio.load(trHtml);
            const iframeSrc = $$('iframe').attr('src');
            if (iframeSrc) {
              const results = await resolveExtractors([iframeSrc], addSource, addSubtitle);
            }
          } catch (e) {}
        })());
      }
      await Promise.all(trPromises);
    }
  } catch (e) {}

  return {
    sources: allSources,
    subtitles,
    ...(allSources.length === 0 ? { error: 'No streams found' } : {}),
  };
}
