import { fetchPage, fetchJSON } from '../utils/request.js';
import { getBaseUrl } from '../utils/helpers.js';

export async function streamtapeExtract(url, addSource, addSubtitle) {
  try {
    const baseUrl = getBaseUrl(url);
    const html = await fetchPage(url, { timeout: 10000 });
    const $ = (await import('cheerio')).default.load(html);

    // Find direct links or embedded video
    const link = $('a.btn.btn-outline-primary, a[href*="streamtape"]').attr('href') ||
                 $('a:contains("Download")').attr('href') ||
                 html.match(/get_video\?id=[^"']+/)?.[0];

    if (link) {
      const finalUrl = link.startsWith('http') ? link : `${baseUrl}/${link}`;
      const videoIdMatch = finalUrl.match(/id=([a-zA-Z0-9]+)/) || finalUrl.match(/\/([a-zA-Z0-9]+)(?:\?|$)/);
      const videoId = videoIdMatch ? videoIdMatch[1] : null;

      if (videoId) {
        // Try StreamTape API
        try {
          const apiRes = await fetchJSON(`https://api.streamtape.com/file/dlticket?file=${videoId}`, { timeout: 5000 });
          const ticket = apiRes?.result?.ticket || apiRes?.ticket;
          if (ticket) {
            const dlRes = await fetchJSON(`https://api.streamtape.com/file/dl?file=${videoId}&ticket=${ticket}`, { timeout: 5000 });
            const dlUrl = dlRes?.result?.url || dlRes?.link;
            if (dlUrl) {
              addSource('StreamTape', dlUrl, 0, dlUrl.includes('.m3u8') ? 'hls' : 'direct', { Referer: baseUrl });
              return;
            }
          }
        } catch (e) {}

        // Fallback: extract m3u8 from page
        const m3u8Match = html.match(/https?:\/\/[^"']+\.m3u8[^"']*/);
        if (m3u8Match) {
          addSource('StreamTape', m3u8Match[0], 0, 'hls', { Referer: baseUrl });
          return;
        }
      }
    }

    // Fallback: look for video element
    const videoSrc = $('video source[src]').attr('src') || $('video[src]').attr('src');
    if (videoSrc) {
      addSource('StreamTape', videoSrc, 0, videoSrc.includes('.m3u8') ? 'hls' : 'mp4', { Referer: baseUrl });
    }
  } catch (e) {
    console.error('StreamTape error:', e.message);
  }
}
