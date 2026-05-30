import { fetchPage, postPage } from '../utils/request.js';

export async function awsstreamExtract(url, addSource, addSubtitle) {
  try {
    const extractedHash = url.split('/').pop();
    const mainUrl = new URL(url).origin;
    const m3u8Url = `${mainUrl}/player/index.php?data=${extractedHash}&do=getVideo`;
    const formData = new URLSearchParams({ hash: extractedHash, r: mainUrl });

    const responseText = await postPage(m3u8Url, formData.toString(), {
      form: true,
      headers: { 'X-Requested-With': 'XMLHttpRequest' },
    });

    const response = JSON.parse(responseText);
    if (response.videoSource) {
      addSource('AWSStream', response.videoSource, 1080, 'hls', { Referer: '' });

      const { fetchPage: fetchRaw } = await import('../utils/request.js');
      const docHtml = await fetchRaw(url);
      const packedMatch = docHtml.match(/<script[^>]*>eval\(function\(p,a,c,k,e,d\)[^<]+<\/script>/i);
      if (packedMatch) {
        const { jsUnpack } = await import('../utils/helpers.js');
        const subtitleRegex = /"kind":\s*"captions"\s*,\s*"file":\s*"(https?.*?\.srt)"/;
        const subMatch = subtitleRegex.exec(docHtml);
        if (subMatch) {
          addSubtitle('English', subMatch[1]);
        }
      }
    }
  } catch (e) {
    console.error('AWSStream error:', e.message);
  }
}
