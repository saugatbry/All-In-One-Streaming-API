import { fetchPage, postPage } from '../utils/request.js';

export async function streamwishExtract(url, addSource, addSubtitle) {
  try {
    const html = await fetchPage(url);
    const matches = html.match(/(?:sources|file)\s*:\s*\[?["']([^"']+)["']\]?/i);
    if (matches && matches[1]) {
      const streamUrl = matches[1];
      const type = streamUrl.includes('.m3u8') ? 'hls' : 'direct';
      addSource('StreamWish', streamUrl, 1080, type, { Referer: url, Origin: new URL(url).origin });
      return;
    }

    const posterMatch = html.match(/poster\s*:\s*["']([^"']+)["']/i);
    if (posterMatch) {
      const streamUrl = posterMatch[1];
      addSource('StreamWish', streamUrl, 0, 'direct', { Referer: url, Origin: new URL(url).origin });
    }
  } catch (e) {
    console.error('StreamWish error:', e.message);
  }
}
