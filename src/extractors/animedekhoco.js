import { fetchPage } from '../utils/request.js';
import * as cheerio from 'cheerio';

export async function animedekhocoExtract(url, addSource, addSubtitle) {
  try {
    if (url.includes('url=')) {
      const html = await fetchPage(url);
      const $ = cheerio.load(html);
      $('select#serverSelector option').each((_, option) => {
        const link = $(option).attr('value');
        const name = $(option).text().trim() || 'Unknown';
        if (link) {
          const type = link.includes('.m3u8') ? 'hls' : link.includes('.mpd') ? 'dash' : 'direct';
          addSource(name, link, 0, type, { Referer: 'https://animedekho.co' });
        }
      });
    } else {
      const text = await fetchPage(url);
      const fileMatch = text.match(/file\s*:\s*"([^"]+)"/);
      if (fileMatch) {
        const link = fileMatch[1];
        const type = link.includes('.m3u8') ? 'hls' : 'direct';
        addSource('Animedekhoco', link, 0, type, { Referer: 'https://animedekho.co' });
      }
    }
  } catch (e) {
    console.error('Animedekhoco error:', e.message);
  }
}
