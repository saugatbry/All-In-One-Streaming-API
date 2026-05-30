import { fetchPage, postPage } from '../utils/request.js';

export async function abyssExtract(url, addSource, addSubtitle) {
  try {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
      'Origin': 'https://playhydrax.com',
      'Referer': 'https://playhydrax.com/',
    };

    const html = await fetchPage(url, { headers });
    const encryptedMatch = html.match(/const\s+datas\s*=\s*"([^"]*)"/);
    if (!encryptedMatch) return;

    const encrypted = encryptedMatch[1];
    const decryptedText = await postPage('https://enc-dec.app/api/dec-abyss', JSON.stringify({ text: encrypted }), {
      headers: { ...headers, 'Content-Type': 'application/json' },
    });

    const decrypted = JSON.parse(decryptedText);
    if (!decrypted.result?.sources) return;

    for (const source of decrypted.result.sources) {
      if (source.status) {
        const quality = source.type.match(/(\d+)/)?.[1] || 1080;
        addSource(`Abyss [${source.codec?.toUpperCase() || ''}]`.trim(), source.url, parseInt(quality), 'direct', {
          Referer: 'https://playhydrax.com/',
        });
      }
    }
  } catch (e) {
    console.error('Abyss error:', e.message);
  }
}
