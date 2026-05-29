# Stream API

REST API for 3 media providers — **AnimeDubHindi**, **Anime Dekho**, and **HDHub4U** — converted from CloudStream3 Kotlin extensions.

## Quick Start

```bash
curl <base>/api/providers
curl "<base>/api/home?provider=hdhub4u"
curl "<base>/api/search?q=batman&provider=hdhub4u"
```

## API Endpoints

Base URL: `https://your-app.vercel.app`

### GET /api/providers
List available providers.

```bash
curl https://your-app.vercel.app/api/providers
```
```json
{
  "success": true,
  "data": [
    { "id": "animedubhindi", "name": "AnimeDubHindi", "lang": "hi", "type": ["movie","anime","cartoon"], "baseUrl": "https://www.animedubhindi.me" },
    { "id": "animedekho", "name": "Anime Dekho", "lang": "hi", "type": ["cartoon","anime","movie"], "baseUrl": "https://animedekho.app" },
    { "id": "hdhub4u", "name": "HDHub4U", "lang": "hi", "type": ["movie","series","anime"], "baseUrl": "https://hdhub4u.rehab" }
  ]
}
```

### GET /api/home?provider=xxx&page=1
Browse content by category for a provider.

| Param | Required | Description |
|---|---|---|
| `provider` | yes | Provider ID |
| `page` | no | Page number |

```bash
curl "https://your-app.vercel.app/api/home?provider=hdhub4u&page=1"
```
```json
{
  "success": true,
  "data": {
    "provider": "hdhub4u",
    "sections": [
      { "name": "Latest", "items": [{ "provider": "hdhub4u", "id": "https://...", "title": "...", "type": "movie", "poster": "..." }] }
    ],
    "hasNext": true
  }
}
```

### GET /api/search?q=&provider=xxx&page=1
Search for content.

| Param | Required | Description |
|---|---|---|
| `q` | yes | Search query |
| `provider` | yes | Provider ID |
| `page` | no | Page number |

```bash
curl "https://your-app.vercel.app/api/search?q=batman&provider=hdhub4u"
```
```json
{
  "success": true,
  "provider": "hdhub4u",
  "query": "batman",
  "data": [{ "provider": "hdhub4u", "id": "https://...", "title": "...", "type": "movie", "poster": "..." }]
}
```

### GET /api/info?id=&provider=xxx
Get full metadata and episode/stream data for a title.

| Param | Required | Description |
|---|---|---|
| `id` | yes | URL (or JSON-encoded data for animedekho) from search result |
| `provider` | yes | Provider ID |

```bash
curl "https://your-app.vercel.app/api/info?id=https%3A%2F%2Fhdhub4u.rehab%2Fthe-batman-2022%2F&provider=hdhub4u"
```
```json
{
  "success": true,
  "data": {
    "provider": "hdhub4u",
    "id": "https://hdhub4u.rehab/the-batman-2022/",
    "title": "The Batman",
    "type": "movie",
    "description": "...",
    "genres": ["Action","Crime","Drama"],
    "rating": 7.8,
    "year": 2022,
    "poster": "https://...",
    "banner": "https://...",
    "cast": [{ "name": "Robert Pattinson", "image": "...", "role": "Bruce Wayne" }],
    "trailer": "https://www.youtube.com/watch?v=...",
    "episodes": [{ "name": "Movie", "season": 1, "episode": 1, "id": "[\"https://...\",\"https://...\"]" }]
  }
}
```

For **series**, episodes have individual `id` values (JSON-encoded link data). For **animedekho**, the `id` is a JSON `Media` object.

### GET /api/watch?id=&provider=xxx&type=movie
Resolve stream URLs from an episode/movie ID.

| Param | Required | Description |
|---|---|---|
| `id` | yes | The `episodes[].id` from `/api/info` |
| `provider` | yes | Provider ID |
| `type` | no | `movie`, `series`, `anime` (default: `movie`) |

```bash
curl "https://your-app.vercel.app/api/watch?id=%5B%22https...%22%5D&provider=hdhub4u"
```
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "provider": "hdhub4u",
    "type": "movie",
    "streams": [
      { "server": "HDHub4U", "quality": "1080p", "type": "hls", "url": "https://...", "headers": { "Referer": "..." } }
    ],
    "subtitles": []
  }
}
```

### Full Flow (zero to stream)

```bash
# 1. List providers
curl https://your-app.vercel.app/api/providers

# 2. Search hdhub4u for "batman"
curl "https://your-app.vercel.app/api/search?q=batman&provider=hdhub4u"

# 3. Get movie info (URL-encode the id)
curl "https://your-app.vercel.app/api/info?id=https%3A%2F%2Fhdhub4u.rehab%2Fthe-batman-2022%2F&provider=hdhub4u"

# 4. Get stream (URL-encode the episodes[0].id)
curl "https://your-app.vercel.app/api/watch?id=%5B%22https...%22%5D&provider=hdhub4u"
```

```javascript
const BASE = 'https://your-app.vercel.app'

// Search
const { data: results } = await fetch(`${BASE}/api/search?q=batman&provider=hdhub4u`).then(r => r.json())

// Info
const { data: info } = await fetch(`${BASE}/api/info?id=${encodeURIComponent(results[0].id)}&provider=hdhub4u`).then(r => r.json())

// Stream
const { data: watch } = await fetch(`${BASE}/api/watch?id=${encodeURIComponent(info.episodes[0].id)}&provider=hdhub4u`).then(r => r.json())

console.log(watch.streams[0].url) // playable URL
```

## Providers

| ID | Name | Content |
|---|---|---|
| `animedubhindi` | AnimeDubHindi | Hindi-dubbed anime & cartoons. Streams via HubCloud/GDFlix. |
| `animedekho` | Anime Dekho | Anime series/movies (multi-language). Streams via VidStream cookie iframes + trdekho API. |
| `hdhub4u` | HDHub4U | Bollywood/Hollywood movies & web series. Uses Typesense search, TMDB metadata, HubCloud/VidStack/HUBCDN extractors. |

## Deploy

```bash
npm install
npm run dev
# or
npx vercel --prod
```

## Project Structure

```
src/
  app/api/
    providers/route.ts       GET /api/providers
    home/route.ts            GET /api/home?provider=
    search/route.ts          GET /api/search?q=&provider=
    info/route.ts            GET /api/info?id=&provider=
    episodes/route.ts        GET /api/episodes?id=&provider=
    watch/route.ts           GET /api/watch?id=&provider=
  core/
    types/index.ts           Shared type definitions
    utils/request.ts         HTTP client with cookie jar + retry
    utils/helpers.ts         URL/encoding helpers
    cache/index.ts           TTL cache
    extractors/index.ts      HubCloud, GDFlix, VidStack, HUBCDN, GDMirrorbot, Hblinks, Hubdrive, gofile, redirect bypass
  providers/
    animedubhindi/{9 files}  home, search, info, watch, episodes, headers, bypass, parser, index
    animedekho/{9 files}
    hdhub4u/{9 files}
    registry.ts              Provider manifest registry
    loader.ts                Static import loader
```

## Notes

- Built with Next.js 14 + TypeScript + App Router
- Streams resolved through multiple extractor backends (HubCloud, GDFlix, VidStack, HUBCDN, GDMirrorbot, Hblinks)
- HDHub4u uses TMDB API (key built-in) for rich metadata
- AnimeDekho uses VidStream cookie rotation + trdekho iframe discovery
- AnimeDubHindi extracts from HubCloud/GDFlix server pages
- All endpoints return `{ success, data }` or `{ success: false, error }`
