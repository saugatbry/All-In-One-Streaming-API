export function getBaseUrl(url) {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.host}`;
  } catch {
    return url;
  }
}

export function getQuality(str) {
  const m = str.match(/(\d{3,4})\s*[pP]/);
  return m ? parseInt(m[1]) : 0;
}

export function getQualityFromName(q) {
  if (/1080/i.test(q)) return 1080;
  if (/720/i.test(q)) return 720;
  if (/480/i.test(q)) return 480;
  if (/360/i.test(q)) return 360;
  return 0;
}

export function cleanTitle(title) {
  let name = title.replace(/\.[a-zA-Z0-9]{2,4}$/, '');
  let normalized = name
    .replace(/WEB[-_. ]?DL/gi, 'WEB-DL')
    .replace(/WEB[-_. ]?RIP/gi, 'WEBRIP')
    .replace(/H[ .]?265/gi, 'H265')
    .replace(/H[ .]?264/gi, 'H264');
  const parts = normalized.split(/[\s_.]+/);
  const tags = ['WEB-DL','WEBRIP','BLURAY','HDRIP','DVDRIP','HDTV','CAM','TS','BRRIP','BDRIP','H264','H265','X264','X265','HEVC','AVC','AAC','AC3','DTS','MP3','FLAC','DD','DDP','EAC3','ATMOS','SDR','HDR','HDR10','HDR10+','DV','DOLBYVISION'];
  const found = parts.filter(p => tags.some(t => p.toUpperCase() === t || p.toUpperCase().startsWith(t)));
  return [...new Set(found)].join(' ');
}

export function rot13(str) {
  return str.replace(/[A-Za-z]/g, c => {
    const code = c.charCodeAt(0);
    const base = code >= 97 ? 97 : 65;
    return String.fromCharCode(((code - base + 13) % 26) + base);
  });
}

export function getIndexQuality(text) {
  if (!text) return 'auto';
  const lower = text.toLowerCase();
  if (lower.includes('4k') || lower.includes('2160p')) return '4K';
  if (lower.includes('1080p')) return '1080p';
  if (lower.includes('720p')) return '720p';
  if (lower.includes('web-dl')) return 'WEB-DL';
  if (lower.includes('bluray') || lower.includes('bdrip') || lower.includes('brrip')) return 'BluRay';
  if (lower.includes('hdrip') || lower.includes('hdr')) return 'HDRip';
  if (lower.includes('cam')) return 'CAM';
  if (lower.includes('hdts')) return 'HDTS';
  return 'auto';
}

export function base64Decode(str) {
  return Buffer.from(str, 'base64').toString('utf-8');
}

export function base64Encode(str) {
  return Buffer.from(str, 'utf-8').toString('base64');
}

export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
