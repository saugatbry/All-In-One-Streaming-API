import { fetchPage, postPage } from '../utils/request.js';

export async function vidhideExtract(url, addSource, addSubtitle) {
  try {
    const html = await fetchPage(url);
    const fileMatch = html.match(/file\s*:\s*["']([^"']+)["']/i);
    const labelMatch = html.match(/label\s*:\s*["']([^"']+)["']/i);

    if (fileMatch) {
      const streamUrl = fileMatch[1];
      const label = labelMatch ? labelMatch[1] : '';
      const quality = label.match(/(\d+)/)?.[1] || 1080;
      const type = streamUrl.includes('.m3u8') ? 'hls' : 'direct';
      addSource('VidHide', streamUrl, parseInt(quality), type, { Referer: url });
    }

    const sourcesMatch = html.match(/sources\s*:\s*\[([^\]]+)\]/);
    if (sourcesMatch) {
      const urlRegex = /["']([^"']+\.(?:m3u8|mp4)[^"']*)["']/g;
      let m;
      while ((m = urlRegex.exec(sourcesMatch[1])) !== null) {
        addSource('VidHide', m[1], 1080, m[1].includes('.m3u8') ? 'hls' : 'direct', { Referer: url });
      }
    }
  } catch (e) {
    console.error('VidHide error:', e.message);
  }
}
