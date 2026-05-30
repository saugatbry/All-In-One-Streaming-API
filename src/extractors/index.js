import { streamwishExtract } from './streamwish.js';
import { vidstackExtract } from './vidstack.js';
import { filemoonExtract } from './filemoon.js';
import { gdmirrorbotExtract } from './gdmirrorbot.js';
import { awsstreamExtract } from './awsstream.js';
import { abyssExtract } from './abyss.js';
import { streamrubyExtract } from './streamruby.js';
import { vidmolyExtract } from './vidmoly.js';
import { animedekhocoExtract } from './animedekhoco.js';
import { hubcloudExtract } from './hubcloud.js';
import { hubdriveExtract } from './hubdrive.js';
import { hubcdnExtract } from './hubcdn.js';
import { blakiteapiExtract } from './blakiteapi.js';
import { gdflixExtract } from './gdflix.js';
import { gofileExtract } from './gofile.js';
import { vidhideExtract } from './vidhide.js';
import { streamtapeExtract } from './streamtape.js';

const extractorMap = [
  { match: /streamwish/i, fn: streamwishExtract, name: 'StreamWish' },
  { match: /strwish/i, fn: streamwishExtract, name: 'StrWish' },
  { match: /cdnwish/i, fn: streamwishExtract, name: 'CdnWish' },
  { match: /asnwish/i, fn: streamwishExtract, name: 'AsnWish' },
  { match: /multimovies\.cloud/i, fn: streamwishExtract, name: 'Multimovies' },
  { match: /allinonedownloader/i, fn: streamwishExtract, name: 'MultimoviesAIO' },
  { match: /vidstack/i, fn: vidstackExtract, name: 'VidStack' },
  { match: /hubstream/i, fn: vidstackExtract, name: 'Hubstream' },
  { match: /vidcloud\.upns/i, fn: vidstackExtract, name: 'VidCloud' },
  { match: /cloudy\.upns/i, fn: vidstackExtract, name: 'Cloudy' },
  { match: /server1\.uns\.bio/i, fn: vidstackExtract, name: 'Server1' },
  { match: /filemoon/i, fn: filemoonExtract, name: 'FileMoon' },
  { match: /gdmirrorbot/i, fn: gdmirrorbotExtract, name: 'GDMirrorbot' },
  { match: /techinmind/i, fn: gdmirrorbotExtract, name: 'Techinmind' },
  { match: /iqsmartgames/i, fn: gdmirrorbotExtract, name: 'Iqsmartgames' },
  { match: /as-cdn\d+/i, fn: awsstreamExtract, name: 'AWSStream' },
  { match: /z\.awstream/i, fn: awsstreamExtract, name: 'AWSStream' },
  { match: /abyssplayer/i, fn: abyssExtract, name: 'Abyss' },
  { match: /rubystm/i, fn: streamrubyExtract, name: 'StreamRuby' },
  { match: /vidmoly/i, fn: vidmolyExtract, name: 'Vidmoly' },
  { match: /animedekho\.co/i, fn: animedekhocoExtract, name: 'Animedekhoco' },
  { match: /hubcloud/i, fn: hubcloudExtract, name: 'HubCloud' },
  { match: /hubdrive/i, fn: hubdriveExtract, name: 'Hubdrive' },
  { match: /hubcdn/i, fn: hubcdnExtract, name: 'HUBCDN' },
  { match: /blakiteapi/i, fn: blakiteapiExtract, name: 'Blakiteapi' },
  { match: /gdflix/i, fn: gdflixExtract, name: 'GDFlix' },
  { match: /gofile/i, fn: gofileExtract, name: 'Gofile' },
  { match: /hdstream4u/i, fn: vidhideExtract, name: 'HdStream4u' },
  { match: /animezia\.cloud/i, fn: vidhideExtract, name: 'Animezia' },
  { match: /dhcplay/i, fn: vidhideExtract, name: 'Dhcplay' },
  { match: /server2\.shop/i, fn: vidhideExtract, name: 'Server2' },
  { match: /hblinks/i, fn: genericScrapeExtract, name: 'Hblinks' },
  { match: /pixeldrain/i, fn: pixeldrainExtract, name: 'PixelDrain' },
  { match: /streamtape|stp|st\/|\.st\//i, fn: streamtapeExtract, name: 'StreamTape' },
];

async function genericScrapeExtract(url, addSource, addSubtitle) {
  try {
    const { fetchPage } = await import('../utils/request.js');
    const html = await fetchPage(url);
    const $ = (await import('cheerio')).default.load(html);
    $('h3 a, h5 a, div.entry-content p a').each((_, el) => {
      const href = $(el).attr('href');
      if (href) {
        resolveExtractors([href], addSource, addSubtitle).catch(() => {});
      }
    });
  } catch (e) {}
}

async function pixeldrainExtract(url, addSource, addSubtitle) {
  try {
    const { fetchPage } = await import('../utils/request.js');
    const base = getBaseUrl(url);
    const fileId = url.split('/').pop();
    const downloadUrl = url.includes('download') ? url : `${base}/api/file/${fileId}?download`;
    addSource('PixelDrain', downloadUrl, 0, 'direct', { Referer: base });
  } catch (e) {}
}

function getBaseUrl(url) {
  try { const u = new URL(url); return `${u.protocol}//${u.host}`; } catch { return url; }
}

export async function resolveExtractors(urls, addSource, addSubtitle) {
  const results = [];
  for (const url of urls) {
    try {
      for (const extractor of extractorMap) {
        if (extractor.match.test(url)) {
          await extractor.fn(url, addSource, addSubtitle);
          break;
        }
      }
    } catch (e) {
      console.error(`Extractor failed for ${url}:`, e.message);
    }
  }
  return results;
}
