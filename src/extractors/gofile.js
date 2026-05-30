import { fetchPage, postPage } from '../utils/request.js';
import { getQuality } from '../utils/helpers.js';

const MAIN_API = 'https://api.gofile.io';

export async function gofileExtract(url, addSource, addSubtitle) {
  try {
    const idMatch = url.match(/(?:\?c=|d\/)([\da-zA-Z-]+)/);
    if (!idMatch) return;
    const id = idMatch[1];

    const accountText = await postPage(`${MAIN_API}/accounts`, '{}', {
      headers: { 'Content-Type': 'application/json' },
    });
    const account = JSON.parse(accountText);
    const token = account.data?.token;
    if (!token) return;

    const globalJs = await fetchPage('https://gofile.io/dist/js/global.js');
    const wtMatch = globalJs.match(/appdata\.wt\s*=\s*["']([^"']+)["']/);
    if (!wtMatch) return;
    const wt = wtMatch[1];

    const filesText = await fetchPage(`${MAIN_API}/contents/${id}?wt=${wt}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const filesJson = JSON.parse(filesText);
    const data = filesJson.data;
    if (!data?.children) return;

    const children = data.children;
    const firstKey = Object.keys(children)[0];
    const fileObj = children[firstKey];
    if (!fileObj?.link) return;

    const link = fileObj.link;
    const fileName = fileObj.name || '';
    const fileSize = fileObj.size || 0;
    const sizeFormatted = fileSize < 1073741824
      ? `${(fileSize / 1048576).toFixed(2)} MB`
      : `${(fileSize / 1073741824).toFixed(2)} GB`;
    const quality = getQuality(fileName) || 0;

    addSource(`Gofile [${sizeFormatted}]`, link, quality, 'direct', {
      Cookie: `accountToken=${token}`,
    });
  } catch (e) {
    console.error('Gofile error:', e.message);
  }
}
