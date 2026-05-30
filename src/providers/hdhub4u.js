import * as cheerio from 'cheerio';
import { fetchPage, fetchJSON } from '../utils/request.js';
import { getQuality, getIndexQuality, rot13, base64Decode, base64Encode, cleanTitle } from '../utils/helpers.js';
import { decryptAESBase64 } from '../utils/crypto.js';
import { resolveExtractors } from '../extractors/index.js';

const FALLBACK_URL = process.env.HDHUB4U_URL || 'https://new1.hdhub4u.limo';
const DOMAINS_JSON = 'https://raw.githubusercontent.com/phisher98/TVVVV/refs/heads/main/domains.json';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
const SEARCH_API = 'https://search.hdhub4u.glass/collections/post/documents/search';
const TMDB_KEY = '1865f43a0549ca50d341dd9ab8b29f49';
const TMDB_BASE = 'https://image.tmdb.org/t/p/original';
const TMDB_API = 'https://api.themoviedb.org/3';

let cachedDomain = null;

async function getBaseUrl() {
  if (cachedDomain) return cachedDomain;
  try {
    const resp = await fetch(DOMAINS_JSON, { signal: AbortSignal.timeout(5000) });
    const data = await resp.json();
    cachedDomain = data?.HDHUB4u || FALLBACK_URL;
  } catch {
    cachedDomain = FALLBACK_URL;
  }
  return cachedDomain;
}

function cleanText(value) {
  return (value || '').replace(/\s+/g, ' ').trim();
}

function decodeRedirect(html) {
  const regex = /s\('o','([A-Za-z0-9+/=]+)'/g;
  let combined = '';
  let m;
  while ((m = regex.exec(html)) !== null) {
    combined += m[1] || '';
  }
  if (!combined) return null;
  try {
    const decoded1 = base64Decode(combined);
    const rot13dec = rot13(decoded1);
    const b64dec2 = base64Decode(rot13dec);
    const data = JSON.parse(b64dec2);
    if (data.o) {
      return base64Decode(data.o).trim();
    }
    if (data.blog_url && data.data) {
      return `${data.blog_url}?re=${data.data}`;
    }
  } catch (e) {}
  return null;
}

function detectQuality(text) {
  const lower = (text || '').toLowerCase();
  if (lower.includes('4k') || lower.includes('2160p')) return '4K';
  if (lower.includes('1080p')) return '1080p';
  if (lower.includes('720p')) return '720p';
  if (lower.includes('480p')) return '480p';
  if (lower.includes('web-dl') || lower.includes('webdl')) return 'WEB-DL';
  if (lower.includes('bluray') || lower.includes('bdrip') || lower.includes('brrip')) return 'BluRay';
  if (lower.includes('hdrip') || lower.includes('hdr')) return 'HDRip';
  if (lower.includes('cam')) return 'CAM';
  if (lower.includes('hdts')) return 'HDTS';
  return 'auto';
}

function guessType(text) {
  const lower = text.toLowerCase();
  if (lower.includes('anime') || lower.includes('cartoon')) return 'anime';
  if (lower.includes('season') || lower.includes('series') || lower.includes('web series')) return 'series';
  return 'movie';
}

function extractId(url) {
  if (!url) return '';
  const parts = url.replace(/\/+$/, '').split('/');
  return parts.filter(Boolean).pop() || '';
}

// ========== TMDB HELPERS ==========

async function resolveTmdbId(imdbId, isMovie) {
  try {
    const json = await fetchJSON(
      `${TMDB_API}/find/${imdbId}?api_key=${TMDB_KEY}&external_source=imdb_id`
    );
    const results = isMovie ? json.movie_results : json.tv_results;
    return results?.[0]?.id ? String(results[0].id) : null;
  } catch { return null; }
}

async function fetchTmdbDetails(tmdbId, isMovie) {
  try {
    const type = isMovie ? 'movie' : 'tv';
    return await fetchJSON(
      `${TMDB_API}/${type}/${tmdbId}?api_key=${TMDB_KEY}&append_to_response=credits,external_ids,videos`
    );
  } catch { return null; }
}

async function fetchTmdbSeason(tmdbId, seasonNum) {
  try {
    return await fetchJSON(
      `${TMDB_API}/tv/${tmdbId}/season/${seasonNum}?api_key=${TMDB_KEY}`
    );
  } catch { return null; }
}

// ========== HOME ==========

const CATEGORIES = [
  { path: '', name: 'Latest' },
  { path: 'category/bollywood-movies/', name: 'Bollywood', type: 'movie' },
  { path: 'category/hollywood-movies/', name: 'Hollywood', type: 'movie' },
  { path: 'category/hindi-dubbed/', name: 'Hindi Dubbed', type: 'movie' },
  { path: 'category/south-hindi-movies/', name: 'South Hindi Dubbed', type: 'movie' },
  { path: 'category/web-series/', name: 'Web Series', type: 'series' },
  { path: 'category/anime/', name: 'Anime', type: 'anime' },
];

export async function getHome(page = 1) {
  const baseUrl = await getBaseUrl();
  const sections = [];

  for (const { path, name, type } of CATEGORIES) {
    try {
      const url = `${baseUrl}/${path}page/${page}/`.replace(/\/\/page/g, '/page');
      const html = await fetchPage(url, { headers: { 'User-Agent': UA } });
      const $ = cheerio.load(html);
      const items = [];

      $('.recent-movies > li.thumb').each((_, el) => {
        const $el = $(el);
        const titleText =
          $el.find('figcaption:nth-child(2) > a:nth-child(1) > p:nth-child(1)').text() ||
          $el.find('figcaption a p').text() ||
          $el.find('h2, h3').first().text();
        const url = $el.find('figure:nth-child(1) > a:nth-child(2)').attr('href') || $el.find('a').first().attr('href');
        const poster = $el.find('figure:nth-child(1) > img:nth-child(1)').attr('src') || $el.find('img').first().attr('src') || '';
        if (!titleText || !url) return;

        const clean = cleanText(titleText.split('(')[0]).replace(/\s+/g, ' ');
        const year = titleText.match(/\b(19|20)\d{2}\b/)?.[0] || '';
        items.push({
          id: extractId(url),
          title: year ? `${clean} (${year})` : clean,
          poster,
          type: type || guessType(titleText),
          quality: detectQuality(titleText) || detectQuality($el.find('figcaption p').text()),
        });
      });

      if (items.length) sections.push({ name, items });
    } catch (e) {}
  }

  return { success: true, results: sections };
}

// ========== SEARCH ==========

export async function searchHDHub4U(q, page = 1) {
  try {
    const json = await fetchPage(
      `${SEARCH_API}?q=${encodeURIComponent(q)}&query_by=post_title,category&query_by_weights=4,2&sort_by=sort_by_date:desc&limit=15&highlight_fields=none&use_cache=true&page=${page}`,
      { headers: { 'User-Agent': UA } }
    );
    const data = JSON.parse(json);
    if (data?.hits?.length) {
      const results = data.hits.map(hit => {
        const doc = hit.document || {};
        const title = cleanText(doc.post_title || '');
        const url = doc.permalink || '';
        const type = doc.category?.some(c =>
          c.toLowerCase().includes('series') || c.toLowerCase().includes('web') || c.toLowerCase().includes('anime')
        ) ? 'series' : 'movie';
        const quality = doc.category?.find(c => detectQuality(c)) || 'auto';
        return {
          id: extractId(url),
          title,
          poster: doc.post_thumbnail || '',
          type,
          quality,
        };
      }).filter(r => r.id && r.title);
      if (results.length) return { success: true, results };
    }
  } catch (e) {}

  // Fallback: HTML search
  try {
    const baseUrl = await getBaseUrl();
    const html = await fetchPage(`${baseUrl}/?s=${encodeURIComponent(q)}`, { headers: { 'User-Agent': UA } });
    const $ = cheerio.load(html);
    const results = [];

    $('.recent-movies > li.thumb, article.post').each((_, el) => {
      const $el = $(el);
      const titleText = $el.find('h2, h3, p').first().text();
      const url = $el.find('a').attr('href');
      const poster = $el.find('img').attr('src');
      if (titleText && url) {
        results.push({
          id: extractId(url),
          title: cleanText(titleText),
          poster: poster || '',
          type: guessType(titleText),
          quality: detectQuality(titleText),
        });
      }
    });

    return { success: true, results };
  } catch (e) {
    return { success: false, results: [], error: e.message };
  }
}

// ========== INFO ==========

export async function infoHDHub4U(id) {
  const baseUrl = await getBaseUrl();
  const pageUrl = id.startsWith('http') ? id : `${baseUrl}/${id.replace(/^\//, '')}`;
  const html = await fetchPage(pageUrl, { headers: { 'User-Agent': UA } });
  const $ = cheerio.load(html);

  let title = $('h2[data-ved]').first().text().trim();
  if (!title) title = $('h1.page-title').text().trim();
  if (!title) title = $('h1').first().text().trim();
  if (!title) throw new Error('Title not found');

  const poster = $('main.page-body img.aligncenter').attr('src') || $('meta[property="og:image"]').attr('content') || '';
  const description = cleanText($('.kno-rdesc .kno-rdesc').text()) || $('meta[name="description"]').attr('content') || '';
  const tags = [];
  $('.page-meta em').each((_, el) => { const t = cleanText($(el).text()); if (t) tags.push(t); });

  const typeText = $('h1.page-title span').text().toLowerCase();
  const isMovie = typeText.includes('movie') || typeText.includes('film');
  const isAnime = typeText.includes('anime') || pageUrl.includes('/anime/');
  const contentType = isMovie ? 'movie' : isAnime ? 'anime' : 'series';

  const trailer = $('.responsive-embed-container > iframe:nth-child(1)').attr('src')?.replace('/embed/', '/watch?v=') || '';

  const imdbUrl = $('div span a[href*="imdb.com"], a[href*="imdb.com/title"]').attr('href') || '';
  const seasonNumber = (() => { const m = title.match(/\bSeason\s*(\d+)\b/i); return m ? parseInt(m[1]) : null; })();

  // Resolve TMDB
  let tmdbId = '';
  const tmdbHref = $('div span a[href*="themoviedb.org"], a[href*="themoviedb.org/"]').attr('href') || '';
  if (tmdbHref) {
    tmdbId = tmdbHref.split('/').pop()?.split('-')[0]?.split('?')[0] || '';
  }
  if (!tmdbId && imdbUrl) {
    const imdbId = imdbUrl.split('title/')[1]?.split('/')[0] || '';
    if (imdbId) tmdbId = await resolveTmdbId(imdbId, isMovie) || '';
  }

  let metaDescription = description;
  let genres = tags.length ? tags : undefined;
  let year;
  let banner = poster;
  let cast;
  let rating;
  let duration;

  if (tmdbId) {
    try {
      const details = await fetchTmdbDetails(tmdbId, isMovie);
      if (details) {
        if (details.overview) metaDescription = details.overview;
        const metaYear = (details.release_date || details.first_air_date || '').slice(0, 4);
        if (metaYear) year = parseInt(metaYear);
        if (details.vote_average) rating = details.vote_average;
        if (details.backdrop_path) banner = `${TMDB_BASE}${details.backdrop_path}`;
        if (details.genres?.length) genres = details.genres.map(g => g.name).filter(Boolean);
        if (details.episode_run_time?.length) duration = details.episode_run_time[0];
        if (details.credits?.cast?.length) {
          cast = details.credits.cast.slice(0, 20).map(c => ({
            name: c.name || '',
            image: c.profile_path ? `${TMDB_BASE}${c.profile_path}` : undefined,
            role: c.character || undefined,
          }));
        }
      }
    } catch (e) {}
  }

  const result = {
    success: true,
    id,
    title,
    poster,
    banner,
    description: metaDescription,
    type: contentType,
    genres: genres?.length ? genres : undefined,
    year,
    rating,
    cast: cast?.length ? cast : undefined,
    trailer: trailer || undefined,
    duration,
  };

  // Parse episodes for series
  if (!isMovie) {
    const epLinksMap = new Map();
    const episodeRegex = /EPISODE\s*(\d+)|episode\s*(\d+)|S(\d{2})E(\d+)|Season\s*\d+\s*Episode\s*(\d+)/i;
    const directCalls = [];

    $('h3, h4').each((_, el) => {
      const $el = $(el);
      const text = $el.text();
      const epNumMatch = text.match(episodeRegex);
      const epNum = epNumMatch
        ? parseInt(epNumMatch[1] || epNumMatch[2] || epNumMatch[3] || epNumMatch[4] || epNumMatch[5])
        : null;
      const links = $el.find('a[href]').map((_, a) => $(a).attr('href') || '').get().filter(Boolean);
      const quality = detectQuality(text);
      const isDirectBlock = $el.find('a').toArray().some(a => /1080|720|4K|2160/i.test($(a).text()));

      if (isDirectBlock && links.length) {
        directCalls.push({ links, quality });
      } else if (epNum !== null && links.length) {
        const existing = epLinksMap.get(epNum) || [];
        epLinksMap.set(epNum, [...existing, ...links]);
      }
    });

    // Resolve direct blocks to find episode links
    await Promise.all(directCalls.map(async ({ links, quality }) => {
      for (const link of links) {
        try {
          const decoded = decodeRedirect(await fetchPage(link.trim(), { headers: { 'User-Agent': UA } }));
          const resolvedUrl = decoded || link;
          if (resolvedUrl === link) continue;
          const subHtml = await fetchPage(resolvedUrl, { headers: { 'User-Agent': UA } });
          const $$ = cheerio.load(subHtml);
          $$('h5 a').each((_, a) => {
            const subText = $$(a).text();
            const subHref = $$(a).attr('href') || '';
            if (!subHref) return;
            const subEpNum = subText.match(/Episode\s*(\d+)/i);
            const ep = subEpNum ? parseInt(subEpNum[1]) : null;
            if (ep !== null) {
              const existing = epLinksMap.get(ep) || [];
              epLinksMap.set(ep, [...existing, subHref]);
            }
          });
        } catch (e) {}
      }
    }));

    // Enrich with TMDB episode data
    const tmdbEpisodes = new Map();
    if (tmdbId) {
      try {
        const details = await fetchTmdbDetails(tmdbId, false);
        const totalSeasons = details?.number_of_seasons || 1;
        const seasonsToFetch = Math.min(totalSeasons, 5);
        const seasonPromises = [];
        for (let s = 1; s <= seasonsToFetch; s++) {
          seasonPromises.push((async () => {
            try {
              const seasonData = await fetchTmdbSeason(tmdbId, s);
              if (seasonData?.episodes) {
                for (const ep of seasonData.episodes) {
                  tmdbEpisodes.set(`${s}-${ep.episode_number}`, {
                    title: ep.name || `Episode ${ep.episode_number}`,
                    thumbnail: ep.still_path ? `${TMDB_BASE}${ep.still_path}` : undefined,
                    airDate: ep.air_date || undefined,
                  });
                }
              }
            } catch (e) {}
          })());
        }
        await Promise.all(seasonPromises);
      } catch (e) {}
    }

    const episodes = [];
    for (const [epNum, rawLinks] of epLinksMap) {
      const deduplicated = [...new Set(rawLinks)];
      const tmdbKey = `${seasonNumber || 1}-${epNum}`;
      const tmdbEp = tmdbEpisodes.get(tmdbKey);
      episodes.push({
        id: base64Encode(JSON.stringify(deduplicated)),
        number: epNum,
        title: tmdbEp?.title || `Episode ${epNum}`,
        thumbnail: tmdbEp?.thumbnail,
        airDate: tmdbEp?.airDate,
      });
    }

    if (episodes.length) {
      result.episodes = episodes.sort((a, b) => a.number - b.number);
    }
  } else {
    // Movie: extract download/stream links from quality blocks
    const movieLinks = [];
    const seenMovieUrls = new Set();

    $('h3, h4').each((_, el) => {
      const $el = $(el);
      const text = $el.text().trim();
      if (!text) return;

      const links = $el.find('a[href]').map((_, a) => $(a).attr('href') || '').get().filter(Boolean);
      if (!links.length) return;

      const isQualityBlock = /\d{3,4}p/i.test(text) || text.toLowerCase().includes('watch') || text.toLowerCase().includes('player');
      if (!isQualityBlock) return;

      const quality = detectQuality(text);
      const sizeMatch = text.match(/\[([^\]]+)\]/);
      const size = sizeMatch ? sizeMatch[1] : '';

      for (const link of links) {
        if (seenMovieUrls.has(link)) continue;
        seenMovieUrls.add(link);
        movieLinks.push({
          quality,
          size,
          url: link,
          label: text.replace(/\s+/g, ' ').trim(),
        });
      }
    });

    if (movieLinks.length) {
      result.downloads = movieLinks;
      // Encode all streamable URLs as base64 (same format as episode IDs)
      const watchUrls = movieLinks.map(l => l.url);
      result.watchId = base64Encode(JSON.stringify(watchUrls));
    }
  }

  return result;
}

// ========== WATCH ==========

export async function watchHDHub4U(episodeId) {
  const baseUrl = await getBaseUrl();
  let urls;
  try {
    const decoded = JSON.parse(base64Decode(episodeId));
    urls = Array.isArray(decoded) ? decoded : decoded.links || [];
  } catch (e) {
    // Try as direct ID/slug
    return await watchFromSlug(episodeId);
  }

  if (!urls?.length) {
    return { success: false, sources: [], subtitles: [], error: 'No URLs found' };
  }

  const sources = [];
  const subtitles = [];
  const seenUrls = new Set();
  const seenSubs = new Set();

  const addSource = (server, streamUrl, quality, type, headers) => {
    if (seenUrls.has(streamUrl)) return;
    seenUrls.add(streamUrl);
    const isM3U8 = streamUrl.includes('.m3u8');
    sources.push({
      server: server || 'HDHub4U',
      url: streamUrl,
      quality: typeof quality === 'number' ? `${quality}p` : quality || 'auto',
      type: type || (isM3U8 ? 'hls' : 'direct'),
      isM3U8,
      headers: headers || { Referer: baseUrl, 'User-Agent': UA },
    });
  };

  const addSubtitle = (lang, subUrl) => {
    const key = `${lang}:${subUrl}`;
    if (lang && subUrl && !seenSubs.has(key)) {
      seenSubs.add(key);
      subtitles.push({ lang, url: subUrl });
    }
  };

  const tasks = urls.map(async (link) => {
    if (seenUrls.has(link)) return;
    seenUrls.add(link);
    try {
      let finalLink = link;
      if (link.includes('?id=')) {
        const html = await fetchPage(link, { headers: { 'User-Agent': UA } });
        const decoded = decodeRedirect(html);
        if (decoded) finalLink = decoded;
      }
      await resolveExtractors([finalLink], addSource, addSubtitle);
    } catch (e) {}
  });

  await Promise.all(tasks);

  return {
    success: sources.length > 0,
    sources,
    subtitles,
    headers: { Referer: baseUrl, 'User-Agent': UA },
    ...(sources.length === 0 ? { error: 'No streams found' } : {}),
  };
}

async function watchFromSlug(slug) {
  const baseUrl = await getBaseUrl();
  const html = await fetchPage(`${baseUrl}/watch/${slug}/`, { headers: { 'User-Agent': UA } });
  const $ = cheerio.load(html);
  const sources = [];
  const subtitles = [];
  const seenUrls = new Set();
  const seenSubs = new Set();

  const addSource = (server, streamUrl, quality, type, headers) => {
    if (seenUrls.has(streamUrl)) return;
    seenUrls.add(streamUrl);
    const isM3U8 = streamUrl.includes('.m3u8');
    sources.push({
      server: server || 'HDHub4U',
      url: streamUrl,
      quality: typeof quality === 'number' ? `${quality}p` : quality || 'auto',
      type: type || (isM3U8 ? 'hls' : 'direct'),
      isM3U8,
      headers: headers || { Referer: baseUrl, 'User-Agent': UA },
    });
  };

  const addSubtitle = (lang, subUrl) => {
    const key = `${lang}:${subUrl}`;
    if (lang && subUrl && !seenSubs.has(key)) {
      seenSubs.add(key);
      subtitles.push({ lang, url: subUrl });
    }
  };

  // Decode redirect
  const redirectUrl = decodeRedirect(html);
  if (redirectUrl) {
    await resolveExtractors([redirectUrl], addSource, addSubtitle);
  }

  // data-embed-id
  $('span[data-embed-id]').each((_, el) => {
    const embedData = $(el).attr('data-embed-id');
    if (!embedData) return;
    try {
      const decoded = base64Decode(embedData);
      if (decoded && decoded.includes('http')) {
        const urlMatch = decoded.match(/(https?:\/\/[^\s"'<>]+)/);
        if (urlMatch) resolveExtractors([urlMatch[1]], addSource, addSubtitle);
      }
    } catch (e) {}
  });

  // iframes
  const watchUrls = [];
  $('iframe').each((_, el) => {
    const src = $(el).attr('src') || $(el).attr('data-src');
    if (src && !src.includes('googletagmanager')) watchUrls.push(src);
  });
  if (watchUrls.length) {
    await resolveExtractors(watchUrls, addSource, addSubtitle);
  }

  return {
    success: sources.length > 0,
    sources,
    subtitles,
    headers: { Referer: baseUrl, 'User-Agent': UA },
    ...(sources.length === 0 ? { error: 'No streams found' } : {}),
  };
}
