import { fetchPage, postPage } from '../utils/request.js';
import { getQuality, getBaseUrl } from '../utils/helpers.js';
import * as cheerio from 'cheerio';

const MAIN_URL = 'https://*.gdflix.*';

async function getLatestUrl() {
  try {
    const text = await fetchPage('https://raw.githubusercontent.com/SaurabhKaperwan/Utils/refs/heads/main/urls.json');
    const json = JSON.parse(text);
    return json.gdflix || MAIN_URL;
  } catch {
    return MAIN_URL;
  }
}

export async function gdflixExtract(url, addSource, addSubtitle) {
  try {
    const latestUrl = await getLatestUrl();
    const newUrl = url.replace(MAIN_URL.replace(/\*/g, '[^.]+'), latestUrl);
    const html = await fetchPage(newUrl);
    const $ = cheerio.load(html);

    const fileName = $('ul > li.list-group-item:contains(Name)').text().split('Name : ')[1] || '';
    const fileSize = $('ul > li.list-group-item:contains(Size)').text().split('Size : ')[1] || '';
    const quality = getQuality(fileName) || 1080;

    const anchors = $('div.text-center a').toArray();

    for (const anchor of anchors) {
      const text = $(anchor).text();
      const link = $(anchor).attr('href');
      if (!link) continue;

      if (text.includes('DIRECT DL')) {
        addSource(`GDFlix[Direct]`, link, quality, 'direct');
      } else if (text.includes('CLOUD DOWNLOAD [R2]')) {
        const finalLink = decodeURIComponent(link.split('url=')[1] || link);
        addSource(`GDFlix[Cloud]`, finalLink, quality, 'direct');
      } else if (/pixeldra/i.test(text) || /pixel/i.test(text)) {
        const base = getBaseUrl(link);
        const finalURL = link.includes('download') ? link : `${base}/api/file/${link.split('/').pop()}?download`;
        addSource(`GDFlix Pixeldrain`, finalURL, quality, 'direct');
      } else if (text.includes('Index Links')) {
        try {
          const idxHtml = await fetchPage(`${latestUrl}${link}`);
          const $$ = cheerio.load(idxHtml);
          const btns = $$('a.btn.btn-outline-info').toArray();
          for (const btn of btns) {
            const serverUrl = latestUrl + $$(btn).attr('href');
            try {
              const srvHtml = await fetchPage(serverUrl);
              const $$$ = cheerio.load(srvHtml);
              const srcAnchors = $$$('div.mb-4 > a').toArray();
              for (const srcAnchor of srcAnchors) {
                const source = $$$(srcAnchor).attr('href');
                if (source) addSource(`GDFlix[Index]`, source, quality, 'direct');
              }
            } catch (e) {}
          }
        } catch (e) {}
      } else if (text.includes('DRIVEBOT')) {
        const id = link.split('id=')[1]?.split('&')[0] || '';
        const doId = link.split('do=')[1]?.split('==')[0] || '';
        const baseUrls = ['https://drivebot.sbs', 'https://indexbot.site'];

        for (const baseUrl of baseUrls) {
          try {
            const indexbotLink = `${baseUrl}/download?id=${id}&do=${doId}`;
            const indexbotResp = await fetchPage(indexbotLink, { timeout: 5000 });

            const tokenMatch = indexbotResp.match(/formData\.append\('token', '([a-f0-9]+)'/);
            const postIdMatch = indexbotResp.match(/fetch\('\/download\?id=([a-zA-Z0-9/\+]+)'/);
            if (!tokenMatch || !postIdMatch) continue;

            const token = tokenMatch[1];
            const postId = postIdMatch[1];

            const formData = new URLSearchParams({ token });
            const downloadResp = await postPage(`${baseUrl}/download?id=${postId}`, formData.toString(), {
              form: true,
              headers: { Referer: indexbotLink },
            });

            const urlMatch = downloadResp.match(/url":"(.*?)"/);
            if (urlMatch) {
              const downloadLink = urlMatch[1].replace(/\\/g, '');
              addSource(`GDFlix[DriveBot]`, downloadLink, quality, 'direct', { Referer: baseUrl });
            }
          } catch (e) {}
        }
      } else if (text.includes('Instant DL')) {
        try {
          const instantResp = await fetchPage(link, { allowRedirects: false });
          const location = typeof instantResp === 'string' ? '' : instantResp?.headers?.['location'];
          const locationStr = location || '';
          const finalLink = locationStr.split('url=')[1] || locationStr;
          if (finalLink) addSource(`GDFlix[Instant Download]`, decodeURIComponent(finalLink), quality, 'direct');
        } catch (e) {}
      } else if (text.includes('GoFile')) {
        try {
          const gfHtml = await fetchPage(link);
          const $$ = cheerio.load(gfHtml);
          const gfAnchors = $$('.row .row a').toArray();
          for (const gfAnchor of gfAnchors) {
            const gfLink = $$(gfAnchor).attr('href');
            if (gfLink && gfLink.includes('gofile')) {
              const { gofileExtract } = await import('./gofile.js');
              await gofileExtract(gfLink, addSource, addSubtitle).catch(() => {});
            }
          }
        } catch (e) {}
      }
    }
  } catch (e) {
    console.error('GDFlix error:', e.message);
  }
}
