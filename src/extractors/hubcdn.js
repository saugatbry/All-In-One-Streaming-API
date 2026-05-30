import { fetchPage } from '../utils/request.js';
import { base64Decode } from '../utils/helpers.js';

export async function hubcdnExtract(url, addSource, addSubtitle) {
  try {
    const html = await fetchPage(url);
    const reurlMatch = html.match(/reurl\s*=\s*"([^"]+)"/);
    if (!reurlMatch) return;

    const encodedUrl = reurlMatch[1];
    const rParam = encodedUrl.includes('?r=') ? encodedUrl.split('?r=')[1] : encodedUrl;
    const decoded = base64Decode(rParam);
    const linkMatch = decoded.match(/link=([^&\s]+)/);
    const streamUrl = linkMatch ? decodeURIComponent(linkMatch[1]) : decoded;

    if (streamUrl) {
      const type = streamUrl.includes('.m3u8') ? 'hls' : 'direct';
      addSource('HUBCDN', streamUrl, 0, type, { Referer: url });
    }
  } catch (e) {
    console.error('HUBCDN error:', e.message);
  }
}
