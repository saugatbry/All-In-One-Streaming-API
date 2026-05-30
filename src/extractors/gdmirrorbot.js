import { fetchPage, postPage } from '../utils/request.js';
import { getBaseUrl, base64Decode } from '../utils/helpers.js';

export async function gdmirrorbotExtract(url, addSource, addSubtitle) {
  try {
    let sid, host;

    if (!url.includes('key=')) {
      sid = url.substring(url.lastIndexOf('embed/') + 6);
      const resp = await fetchPage(url, { allowRedirects: true });
      host = getBaseUrl(resp.request?.res?.responseUrl || url);
    } else {
      const pageText = await fetchPage(url);
      const finalId = pageText.match(/FinalID\s*=\s*"([^"]+)"/)?.[1];
      const myKey = pageText.match(/myKey\s*=\s*"([^"]+)"/)?.[1];
      const idType = pageText.match(/idType\s*=\s*"([^"]+)"/)?.[1] || 'imdbid';
      const baseUrlMatch = pageText.match(/let\s+baseUrl\s*=\s*"([^"]+)"/)?.[1];
      host = baseUrlMatch ? getBaseUrl(baseUrlMatch) : null;

      if (finalId && myKey) {
        let apiUrl;
        if (url.includes('/tv/')) {
          const season = url.match(/\/tv\/\d+\/(\d+)\//)?.[1] || '1';
          const episode = url.match(/\/tv\/\d+\/\d+\/(\d+)/)?.[1] || '1';
          apiUrl = `${host || getBaseUrl(url)}/myseriesapi?tmdbid=${finalId}&season=${season}&epname=${episode}&key=${myKey}`;
        } else {
          apiUrl = `${host || getBaseUrl(url)}/mymovieapi?${idType}=${finalId}&key=${myKey}`;
        }
        const apiText = await fetchPage(apiUrl);
        const apiData = JSON.parse(apiText);
        const embedId = url.split('/').pop();
        sid = apiData.data?.[0]?.fileslug || embedId;
      } else {
        sid = url.split('/').pop();
      }

      if (!host) host = getBaseUrl(url);
    }

    const formData = new URLSearchParams({ sid });
    const responseText = await postPage(`${host}/embedhelper.php`, formData.toString(), { form: true });

    const root = JSON.parse(responseText);
    const siteUrls = root.siteUrls;
    const mresult = root.mresult;
    const siteFriendlyNames = root.siteFriendlyNames;

    if (!siteUrls || !mresult) return;

    let decodedMresult;
    if (typeof mresult === 'object' && !Array.isArray(mresult)) {
      decodedMresult = mresult;
    } else if (typeof mresult === 'string') {
      decodedMresult = JSON.parse(base64Decode(mresult));
    } else {
      return;
    }

    for (const key of Object.keys(siteUrls)) {
      if (!decodedMresult[key]) continue;
      const base = siteUrls[key].replace(/\/+$/, '');
      const path = decodedMresult[key].replace(/^\/+/, '');
      const fullUrl = `${base}/${path}`;
      const friendlyName = siteFriendlyNames?.[key] || key;

      try {
        if (['StreamHG', 'EarnVids'].includes(friendlyName)) {
          const { vidhideExtract } = await import('./vidhide.js');
          await vidhideExtract(fullUrl, addSource, addSubtitle);
        } else if (['RpmShare', 'UpnShare', 'StreamP2p'].includes(friendlyName)) {
          const { vidstackExtract } = await import('./vidstack.js');
          await vidstackExtract(fullUrl, addSource, addSubtitle);
        } else {
          const { resolveExtractors } = await import('./index.js');
          await resolveExtractors([fullUrl], addSource, addSubtitle);
        }
      } catch (e) {
        console.error(`GDMirrorbot sub-extractor ${friendlyName} failed:`, e.message);
      }
    }
  } catch (e) {
    console.error('GDMirrorbot error:', e.message);
  }
}
