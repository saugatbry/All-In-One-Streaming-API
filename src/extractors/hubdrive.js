import { fetchPage } from '../utils/request.js';

export async function hubdriveExtract(url, addSource, addSubtitle) {
  try {
    const html = await fetchPage(url, { timeout: 5000 });
    const $ = (await import('cheerio')).default.load(html);
    const href = $('.btn.btn-primary.btn-user.btn-success1.m-1').attr('href');
    if (!href) return;

    if (href.toLowerCase().includes('hubcloud')) {
      const { hubcloudExtract } = await import('./hubcloud.js');
      await hubcloudExtract(href, addSource, addSubtitle);
    } else {
      const { resolveExtractors } = await import('./index.js');
      await resolveExtractors([href], addSource, addSubtitle);
    }
  } catch (e) {
    console.error('Hubdrive error:', e.message);
  }
}
