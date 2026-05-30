import { fetchPage } from '../utils/request.js';
import { getQualityFromName } from '../utils/helpers.js';

export async function blakiteapiExtract(url, addSource, addSubtitle) {
  try {
    const id = url.split('/').pop();
    const tmdbId = url.split('embed/')[1]?.split('/')[0] || '';
    const apiUrl = `https://blakiteapi.xyz/api/get.php?id=${id}&tmdbId=${tmdbId}`;
    const responseText = await fetchPage(apiUrl);
    const json = JSON.parse(responseText);

    if (json.success) {
      const data = json.data;
      const quality = data.quality || '480p';
      const format = data.format || 'MP4';
      const dataId = data.dataId || '';
      const streamUrl = `https://blakiteapi.xyz/stream/${dataId}.${format}`;
      addSource('Blakiteapi', streamUrl, getQualityFromName(quality), 'direct');
    }
  } catch (e) {
    console.error('Blakiteapi error:', e.message);
  }
}
