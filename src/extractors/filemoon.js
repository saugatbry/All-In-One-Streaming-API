import { fetchPage } from '../utils/request.js';

export async function filemoonExtract(url, addSource, addSubtitle) {
  try {
    const html = await fetchPage(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    const fileMatch = html.match(/file\s*:\s*["']([^"']+)["']/i);
    const labelMatch = html.match(/label\s*:\s*["']([^"']+)["']/i);
    const typeMatch = html.match(/type\s*:\s*["']([^"']+)["']/i);

    if (fileMatch) {
      const streamUrl = fileMatch[1];
      const label = labelMatch ? labelMatch[1] : '';
      const quality = label.match(/(\d+)/)?.[1] || 1080;
      const type = typeMatch?.[1]?.includes('m3u8') || streamUrl.includes('.m3u8') ? 'hls' : 'direct';
      addSource('FileMoon', streamUrl, parseInt(quality), type, { Referer: url });
    }

    const sourcesMatch = html.match(/sources\s*:\s*\[([^\]]+)\]/i);
    if (sourcesMatch) {
      const srcRegex = /["']([^"']+\.(?:m3u8|mp4)[^"']*)["']/gi;
      let srcMatch;
      while ((srcMatch = srcRegex.exec(sourcesMatch[1])) !== null) {
        addSource('FileMoon', srcMatch[1], 1080, srcMatch[1].includes('.m3u8') ? 'hls' : 'direct', { Referer: url });
      }
    }
  } catch (e) {
    console.error('FileMoon error:', e.message);
  }
}
