import * as cheerio from 'cheerio';
import { fetchPage } from '../utils/request.js';
import { base64Decode, getQuality } from '../utils/helpers.js';
import { resolveExtractors } from '../extractors/index.js';

const BASE_URL = 'https://www.desidubanime.me';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

function cleanText(value) {
  return (value || '').replace(/\s+/g, ' ').trim();
}

function extractSlug(url) {
  const m = url.match(/\/(?:anime|series)\/([^/]+)\/?$/);
  return m ? m[1] : '';
}

async function fetchWithRetry(paths) {
  let lastErr;
  for (const path of paths) {
    try {
      const url = path.startsWith('http') ? path : `${BASE_URL}${path}`;
      const headers = { 'User-Agent': UA };
      const html = await fetchPage(url, { headers, timeout: 30000 });
      if (html && html.length > 200) return html;
      lastErr = new Error('Empty or too short response');
    } catch (e) {
      if (e.message?.includes('404')) throw e;
      lastErr = e;
    }
  }
  throw lastErr || new Error('Failed to fetch page after all retries');
}

// ========== HOME ==========

export async function getHome() {
  const html = await fetchWithRetry(['/home/', '/', '/az-list/']);
  const $ = cheerio.load(html);
  const items = [];

  $('.swiper-slide, article.post, .latest-episodes article, a[href*="/anime/"]').each((_, el) => {
    const a = $(el).is('a') ? $(el) : $(el).find('a').first();
    let title = cleanText(
      $(el).find('h2 span[data-en-title]').text() ||
      $(el).find('h1, h2, h3, .entry-title').first().text() ||
      a.attr('title')
    );
    const url = a.attr('href');
    const poster = $(el).find('img').attr('data-src') || $(el).find('img').attr('src');
    const slug = url ? extractSlug(url) : '';
    if (!title && slug) title = cleanText(slug.replace(/[-_]+/g, ' '));
    if (title && slug && url) items.push({ id: slug, title, type: 'series', poster });
  });

  const unique = Array.from(new Map(items.map(i => [i.id, i])).values()).slice(0, 24);
  return { success: true, results: unique };
}

// ========== SEARCH ==========

export async function searchDesiDubAnime(q) {
  // Primary: WordPress JSON REST API (fast)
  try {
    const apiUrl = `${BASE_URL}/wp-json/wp/v2/anime?search=${encodeURIComponent(q)}&per_page=30&_embed=1`;
    const json = await fetchPage(apiUrl, { timeout: 10000 });
    const items = JSON.parse(json);
    if (Array.isArray(items) && items.length > 0) {
      const results = items
        .map(item => {
          const title = cleanText(item?.title?.rendered || item?.slug || '');
          const slug = String(item?.slug || '');
          const poster = item?._embedded?.['wp:featuredmedia']?.[0]?.source_url ||
            item?._embedded?.['wp:featuredmedia']?.[0]?.media_details?.sizes?.medium?.source_url || '';
          const type = item?.type || 'series';
          return title && slug ? { id: slug, title, type, poster } : null;
        })
        .filter(Boolean);
      if (results.length > 0) return { success: true, results };
    }
  } catch (e) {
    // Fall through to HTML scraping
  }

  // Fallback: HTML scraping
  const html = await fetchWithRetry([`/?s=${encodeURIComponent(q)}`]);
  const $ = cheerio.load(html);
  const results = [];

  $('article.post, article, .search-page article, a[href*="/anime/"]').each((_, el) => {
    const a = $(el).is('a') ? $(el) : $(el).find('a.lnk-blk, .entry-title a, h2 a, h3 a, a[href*="/anime/"]').first();
    const title = cleanText($(el).find('.entry-title').text() || a.text() || a.attr('title'));
    const url = a.attr('href');
    const poster = $(el).find('img').attr('data-src') || $(el).find('img').attr('src');
    const slug = url ? extractSlug(url) : '';
    if (title && slug) results.push({ id: slug, title, type: 'series', poster });
  });

  return { success: true, results };
}

// ========== INFO ==========

export async function infoDesiDubAnime(id) {
  const html = await fetchWithRetry([`/anime/${id}/`, `/series/${id}/`]);
  const $ = cheerio.load(html);

  const title = cleanText(
    $('h1').first().text() ||
    $('meta[property="og:title"]').attr('content') ||
    id.replace(/[-_]+/g, ' ')
  );
  const poster = $('.anime-image img').attr('data-src') || $('.anime-image img').attr('src') ||
    $('img[data-src*="/anime/"]').attr('data-src') || $('img[src*="/anime/"]').attr('src');
  const description = cleanText(
    $('[data-synopsis]').text() ||
    $('.anime-synopsis, .entry-content p, .description').first().text() ||
    $('meta[property="og:description"]').attr('content')
  );
  const episodes = [];

  // Primary: swiper carousel
  $('.swiper-episode-anime .swiper-slide a').each((_, el) => {
    const epUrl = $(el).attr('href');
    const epTitle = cleanText($(el).attr('title') || $(el).find('.episode-list-item-title').text());
    const epNumStr = $(el).find('.episode-list-item-number').text().trim() || $(el).find('span').text().replace('Episode', '').trim();
    const epImage = $(el).find('img').attr('src') || $(el).find('img').attr('data-src');
    if (epUrl) {
      const m = epUrl.match(/\/watch\/([^/]+)\/?/);
      const epId = m ? m[1] : '';
      const epNumFromUrl = parseFloat(epUrl.match(/episode-(\d+)/i)?.[1]) || 0;
      const parsedNum = parseFloat(epNumStr) || epNumFromUrl || 0;
      if (epId) episodes.push({
        id: epId,
        number: parsedNum,
        title: epTitle && !/^watch\s*now$/i.test(epTitle) ? epTitle : `Episode ${parsedNum || '1'}`,
        image: epImage,
      });
    }
  });

  // Fallback: episode-list-display-box
  if (episodes.length === 0) {
    $('.episode-list-display-box a, a[href*="/watch/"]').each((_, el) => {
      const epUrl = $(el).attr('href');
      if (!epUrl || !epUrl.includes('/watch/')) return;
      const m = epUrl.match(/\/watch\/([^/]+)\/?/);
      const epId = m ? m[1] : '';
      const epNum = parseFloat(epUrl.match(/episode-(\d+)/i)?.[1]) || 0;
      const rawTitle = $(el).find('.episode-list-item-title').text().trim() || $(el).text().trim();
      if (epId && epNum) episodes.push({
        id: epId,
        number: epNum,
        title: rawTitle && !/^watch\s*now$/i.test(rawTitle) ? rawTitle : `Episode ${epNum}`,
      });
    });
  }

  // Last fallback: any /watch/ link
  if (episodes.length <= 1) {
    $('a[href*="/watch/"]').each((_, el) => {
      const epUrl = $(el).attr('href');
      if (!epUrl) return;
      const epId = epUrl.match(/\/watch\/([^/]+)\/?/)?.[1] || '';
      const epNum = parseFloat(epUrl.match(/episode-(\d+)/i)?.[1]) || 0;
      if (epId && epNum && !episodes.some(e => e.id === epId)) {
        episodes.push({ id: epId, number: epNum, title: `Episode ${epNum}` });
      }
    });
  }

  // Sort & deduplicate
  const sorted = Array.from(new Map(episodes.map(ep => [ep.id, ep])).values())
    .sort((a, b) => a.number - b.number);

  return {
    success: true,
    id,
    title,
    poster,
    description,
    type: 'series',
    episodes: sorted,
  };
}

// ========== WATCH ==========

export async function watchDesiDubAnime(episodeId) {
  const html = await fetchWithRetry([`/watch/${episodeId}/`]);
  const $ = cheerio.load(html);
  const allSources = [];
  const seenUrls = new Set();
  const subtitles = [];

  function addSource(server, streamUrl, quality, type, headers) {
    if (seenUrls.has(streamUrl)) return;
    seenUrls.add(streamUrl);
    const isM3U8 = streamUrl.includes('.m3u8');
    const detectedQuality = quality || getQuality(streamUrl) || getQuality(server) || 'auto';
    allSources.push({
      server: server || 'DesiDubAnime',
      url: streamUrl,
      quality: typeof detectedQuality === 'number' ? `${detectedQuality}p` : detectedQuality,
      type: type || (isM3U8 ? 'hls' : 'direct'),
      isM3U8,
      headers: headers || { Referer: BASE_URL, 'User-Agent': UA },
    });
  }

  function addSubtitle(lang, subUrl) {
    if (!subtitles.some(s => s.lang === lang && s.url === subUrl)) {
      subtitles.push({ lang, url: subUrl });
    }
  }

  // Primary: data-embed-id base64 decoding
  $('span[data-embed-id]').each((_, el) => {
    const embedData = $(el).attr('data-embed-id');
    if (!embedData) return;
    const parts = embedData.split(':');
    if (parts.length < 2) return;
    const [b64Name, b64Url] = parts;
    let serverName = '';
    let finalUrl = '';
    try { serverName = base64Decode(b64Name); } catch {}
    try { finalUrl = base64Decode(b64Url); } catch {}
    if (!finalUrl || !serverName) return;

    // Extract iframe src from HTML-encoded embed
    if (finalUrl.includes('<iframe')) {
      const m = finalUrl.match(/src=['"]([^'"]+)['"]/);
      if (m) finalUrl = m[1];
    }
    // Extract iframe src from script-based embed
    if (finalUrl.includes('document.write') || finalUrl.includes('<script')) {
      const m = finalUrl.match(/src=["']([^"']+)["']/);
      if (m) finalUrl = m[1];
    }

    if (finalUrl && !finalUrl.includes('googletagmanager')) {
      const isDub = serverName.toLowerCase().includes('dub');
      addSource(
        serverName.replace(/dub$/i, ''),
        finalUrl,
        'auto',
        finalUrl.includes('.m3u8') ? 'hls' : 'embed',
        { Referer: BASE_URL, 'User-Agent': UA }
      );
    }
  });

  // Fallback: iframes
  if (allSources.length === 0) {
    $('iframe').each((_, el) => {
      const src = $(el).attr('src') || $(el).attr('data-src');
      if (src && !src.includes('googletagmanager') && !src.includes('cdn-cgi')) {
        addSource('Default', src, 'auto', 'embed', { Referer: BASE_URL, 'User-Agent': UA });
      }
    });
  }

  // Fallback: extract URLs from scripts
  if (allSources.length === 0) {
    const scripts = $('script').map((_, el) => $(el).html() || '').get().join('\n');
    const urlMatches = scripts.match(/https?:\/\/[^\s"'<>]+/g) || [];
    for (const raw of urlMatches) {
      const u = raw.replace(/\\\//g, '/');
      if (seenUrls.has(u)) continue;
      if (/googletagmanager|google-analytics|doubleclick|cdn-cgi/i.test(u)) continue;
      if (!/m3u8|mp4/i.test(u) && !u.includes('embed') && !u.includes('player')) continue;
      seenUrls.add(u);
      addSource('Direct', u, 'auto', u.includes('.m3u8') ? 'hls' : 'direct', { Referer: BASE_URL, 'User-Agent': UA });
    }
  }

  // Try to resolve embed URLs through extractors for known domains
  const embedUrls = allSources
    .filter(s => s.url && !s.url.includes('.m3u8') && !s.url.includes('.mp4'))
    .map(s => s.url);

  if (embedUrls.length > 0) {
    try {
      await resolveExtractors(embedUrls, addSource, addSubtitle);
    } catch (e) {
      // Extractor resolution is best-effort
    }
  }

  // Filter: prefer extractor-resolved sources over raw embeds
  const resolvedSources = allSources.filter(s => s.type === 'hls' || s.type === 'direct' || s.isM3U8);
  const embedSources = allSources.filter(s => s.type === 'embed' && !s.isM3U8);

  const finalSources = resolvedSources.length > 0 ? resolvedSources : embedSources;

  return {
    success: true,
    sources: finalSources,
    subtitles,
    headers: { Referer: BASE_URL, 'User-Agent': UA },
  };
}
