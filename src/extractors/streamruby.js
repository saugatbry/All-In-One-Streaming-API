import { fetchPage } from '../utils/request.js';

export async function streamrubyExtract(url, addSource, addSubtitle) {
  try {
    const cleanedUrl = url.replace('/e', '');
    const html = await fetchPage(cleanedUrl, {
      headers: { 'X-Requested-With': 'XMLHttpRequest' },
      referer: cleanedUrl,
    });

    const fileMatch = html.match(/file:"([^"]*)"/);
    if (fileMatch) {
      const streamUrl = fileMatch[1];
      const type = streamUrl.includes('.m3u8') ? 'hls' : 'direct';
      addSource('StreamRuby', streamUrl, 1080, type, {
        Accept: '*/*',
        Connection: 'keep-alive',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'cross-site',
        Origin: cleanedUrl,
      });
    }
  } catch (e) {
    console.error('StreamRuby error:', e.message);
  }
}
