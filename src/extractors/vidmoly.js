import { fetchPage } from '../utils/request.js';

export async function vidmolyExtract(url, addSource, addSubtitle) {
  try {
    const html = await fetchPage(url);
    const fileMatch = html.match(/file:\s*["']([^"']+)["']/i);
    const labelMatch = html.match(/label:\s*["']([^"']+)["']/i);

    if (fileMatch) {
      const streamUrl = fileMatch[1];
      const label = labelMatch ? labelMatch[1] : '';
      const quality = label.match(/(\d+)/)?.[1] || 720;
      const type = streamUrl.includes('.m3u8') ? 'hls' : 'direct';
      addSource('Vidmoly', streamUrl, parseInt(quality), type, { Referer: url });
    }

    const sourcesMatch = html.match(/sources\s*:\s*\[([^\]]+)\]/);
    if (sourcesMatch) {
      const urlRegex = /["']([^"']+\.(?:m3u8|mp4)[^"']*)["']/g;
      let m;
      while ((m = urlRegex.exec(sourcesMatch[1])) !== null) {
        addSource('Vidmoly', m[1], 720, m[1].includes('.m3u8') ? 'hls' : 'direct', { Referer: url });
      }
    }
  } catch (e) {
    console.error('Vidmoly error:', e.message);
  }
}
