import { fetchPage } from '../utils/request.js';
import { getQuality, cleanTitle, getBaseUrl } from '../utils/helpers.js';

export async function hubcloudExtract(url, addSource, addSubtitle) {
  try {
    const uri = new URL(url);
    const baseUrl = `${uri.protocol}//${uri.host}`;

    let href;
    if (url.includes('hubcloud.php')) {
      href = url;
    } else {
      const html = await fetchPage(url);
      const $ = (await import('cheerio')).default.load(html);
      const raw = $('#download').attr('href') || '';
      href = raw.startsWith('http') ? raw : baseUrl.replace(/\/+$/, '') + '/' + raw.replace(/^\/+/, '');
    }

    if (!href) return;

    const docHtml = await fetchPage(href);
    const $$ = (await import('cheerio')).default.load(docHtml);

    const size = $$('i#size').text() || '';
    const header = $$('div.card-header').text() || '';
    const headerDetails = cleanTitle(header);
    const quality = getQuality(header) || 2160;
    const labelExtras = [headerDetails ? `[${headerDetails}]` : '', size ? `[${size}]` : ''].filter(Boolean).join('');

    $$('a.btn').each((_, el) => {
      const link = $$(el).attr('href');
      const text = $$(el).ownText() || '';
      const label = text.toLowerCase();

      if (!link) return;

      if (label.includes('fsl server')) {
        addSource(`HubCloud [FSL Server]`, link, quality, 'direct');
      } else if (label.includes('download file')) {
        addSource(`HubCloud`, link, quality, 'direct');
      } else if (label.includes('buzzserver')) {
        fetchPage(`${link}/download`, { allowRedirects: false, headers: { Referer: link } })
          .then(resp => {
            const dlink = resp.headers?.['hx-redirect'] || resp.headers?.['HX-Redirect'] || '';
            if (dlink) addSource(`HubCloud [BuzzServer]`, dlink, quality, 'direct');
          })
          .catch(() => {});
      } else if (label.includes('pixeldra') || label.includes('pixelserver') || label.includes('pixel server') || label.includes('pixeldrain')) {
        const base = getBaseUrl(link);
        const finalUrl = link.includes('download') ? link : `${base}/api/file/${link.split('/').pop()}?download`;
        addSource(`HubCloud Pixeldrain`, finalUrl, quality, 'direct');
      } else if (label.includes('s3 server')) {
        addSource(`HubCloud [S3 Server]`, link, quality, 'direct');
      } else if (label.includes('fslv2')) {
        addSource(`HubCloud [FSLv2]`, link, quality, 'direct');
      } else if (label.includes('mega server')) {
        addSource(`HubCloud [Mega Server]`, link, quality, 'direct');
      }
    });
  } catch (e) {
    console.error('HubCloud error:', e.message);
  }
}
