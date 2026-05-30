import { fetchPage } from '../utils/request.js';
import { decryptAES } from '../utils/crypto.js';

export async function vidstackExtract(url, addSource, addSubtitle) {
  try {
    const hash = url.split('#').pop()?.split('/').pop() || url.split('/').pop();
    const baseUrl = new URL(url).origin;
    const headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:134.0) Gecko/20100101 Firefox/134.0' };
    const encoded = await fetchPage(`${baseUrl}/api/v1/video?id=${hash}`, { headers });

    const key = 'kiemtienmua911ca';
    const ivList = ['1234567890oiuytr', '0123456789abcdef'];
    let decryptedText = null;

    for (const iv of ivList) {
      try {
        decryptedText = decryptAES(encoded.trim(), key, iv);
        break;
      } catch (e) {}
    }

    if (!decryptedText) return;

    const m3u8Match = decryptedText.match(/"source"\s*:\s*"(.*?)"/);
    const m3u8 = m3u8Match?.[1]?.replace(/\\\//g, '/');
    if (!m3u8) return;

    const subtitleSection = decryptedText.match(/"subtitle"\s*:\s*\{(.*?)\}/)?.[1];
    if (subtitleSection) {
      const subRegex = /"([^"]+)"\s*:\s*"([^"]+)"/g;
      let subMatch;
      while ((subMatch = subRegex.exec(subtitleSection)) !== null) {
        const lang = subMatch[1];
        let rawPath = subMatch[2].split('#')[0].replace(/\\\//g, '/');
        if (rawPath) {
          addSubtitle(lang, `${baseUrl}${rawPath}`);
        }
      }
    }

    addSource('VidStack', m3u8.replace(/^https:\/\//, 'http://'), 0, 'hls', {
      referer: url,
      Origin: new URL(url).origin,
    });
  } catch (e) {
    console.error('VidStack error:', e.message);
  }
}
