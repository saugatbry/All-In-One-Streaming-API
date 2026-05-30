import http from 'http';

function httpGet(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve(JSON.parse(d)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

async function main() {
  try {
    const search = await httpGet('http://localhost:3000/api/search?q=naruto&provider=animedekho');
    console.log('Search results:', search.results?.length || 0);
    if (!search.results?.length) { console.log('No results'); return; }
    const id = search.results[0].id;
    console.log('First ID:', id);

    const info = await httpGet(`http://localhost:3000/api/info?id=${encodeURIComponent(id)}&provider=animedekho`);
    console.log('Info title:', info.data?.title);
    console.log('Info type:', info.data?.type);
    console.log('Episodes:', info.data?.episodes?.length || 0);
    if (info.data?.episodes?.length) {
      const epId = info.data.episodes[0].id;
      console.log('First ep ID (truncated):', epId?.substring(0, 60) + '...');

      const watch = await httpGet(`http://localhost:3000/api/watch?id=${encodeURIComponent(epId)}&provider=animedekho`);
      console.log('Watch sources:', watch.sources?.length || 0);
      console.log('Watch subtitles:', watch.subtitles?.length || 0);
      if (watch.sources?.length) {
        console.log('First source:', JSON.stringify(watch.sources[0], null, 2));
      }
    }
  } catch (e) {
    console.error('Error:', e.message);
  }
}

main();
