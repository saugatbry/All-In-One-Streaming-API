# 🎬 All-In-One Streaming API

A **REST API** that gives you access to movies, TV series, anime, live TV channels, and live sports — all through simple HTTP requests. Built by converting CloudStream3 Android extension code to a deployable web service.

> **No browser automation needed** — everything runs server-side using fast HTTP scraping.

---

## 📋 Table of Contents
- [Quick Start](#-quick-start)
- [What Can You Build?](#-what-can-you-build)
- [Available Providers](#-available-providers)
- [API Endpoints](#-api-endpoints)
  - [1. List All Providers](#1-list-all-providers)
  - [2. Browse Content (Main Page)](#2-browse-content-main-page)
  - [3. Search](#3-search)
  - [4. Get Details (Movie, Series, or Channel)](#4-get-details-movie-series-or-channel)
  - [5. Get Stream Links](#5-get-stream-links)
- [Complete Example Flow](#-complete-example-flow)
- [Real-World Usage Examples](#-real-world-usage-examples)
- [Deploy to Vercel](#-deploy-to-vercel)
- [Run Locally](#-run-locally)
- [Project Structure](#-project-structure)
- [FAQ](#-faq)

---

## 🚀 Quick Start

```bash
# Step 1: Deploy to Vercel (free)
# Just push this repo to GitHub and import it at https://vercel.com/import

# Step 2: Make your first API call
curl https://your-app.vercel.app/api/providers

# Step 3: Search for content
curl "https://your-app.vercel.app/api/hdhub4u/search?q=batman"
```

**That's it.** No database, no auth, no setup. Just API calls.

---

## 🎯 What Can You Build?

| Use Case | Example |
|---|---|
| 🎥 Movie streaming website | Search movies → get details → stream |
| 📺 Live TV app | Browse IPTV channels → watch live |
| 🏆 Sports tracker | List live matches → get stream URLs |
| 🔍 Content aggregator | Search across ALL providers at once |
| 🤖 Telegram/Discord bot | Search → send stream links to users |

---

## 📦 Available Providers

| ID | Name | Language | Content Type | What It Scrapes |
|---|---|---|---|---|
| `allmovieland` | AllMovieLand | Hindi | Movies, Series, Cartoons | allmovieland.you |
| `animedekho` | Anime Dekho | Hindi | Anime, Cartoons (dubbed) | animedekho.app |
| `animedubhindi` | AnimeDubHindi | Hindi | Anime, Cartoons | animedubhindi.me |
| `hdhub4u` | HDHub4U | Hindi | Movies, Web Series | hdhub4u.rehab |
| `hindmoviez` | Hindmoviez | Hindi | Movies, Web Series, K/C-Dramas, Anime | hindmoviez.cafe |
| `iptvplayer` | IPTV Player | Hindi | Live TV Channels | M3U playlist (GitHub) |
| `multimovies` | MultiMovies | Hindi | Bollywood, Hollywood, OTT, KDrama | multimovies.autos |
| `publicsportsiptv` | PublicSportsIPTV | English | Live Sports Events | FanCode API |
| `uhdmovies` | UHDmovies | English | 4K/HDR Movies, Series | uhdmovies.rip |

> **Language column:** `hi` = Hindi content, `en` = English content. This affects the audio/video you get.

---

## 🔌 API Endpoints

**Base URL:** `https://your-app.vercel.app` (replace with your actual Vercel URL)

---

### 1. List All Providers

See every provider available:

```
GET /api/providers
```

**Example request:**
```bash
curl https://your-app.vercel.app/api/providers
```

**Example response:**
```json
{
  "success": true,
  "data": [
    { "id": "allmovieland", "name": "AllMovieLand", "lang": "hi", "type": "movie", "baseUrl": "https://allmovieland.you" },
    { "id": "iptvplayer",   "name": "IPTV Player",   "lang": "hi", "type": "live", "baseUrl": "https://raw.githubusercontent.com/..." },
    { "id": "publicsportsiptv", "name": "PublicSportsIPTV", "lang": "en", "type": "live", "baseUrl": "https://fancode.com" }
  ],
  "total": 9
}
```

---

### 2. Browse Content (Main Page)

Get the homepage/category listing of a provider:

```
GET /api/:provider/mainpage?page=1
```

**Parameters:**
| Name | Type | Required | Default | Description |
|---|---|---|---|---|
| `page` | number | No | 1 | Page number for pagination |

**Example request:**
```bash
curl "https://your-app.vercel.app/api/hdhub4u/mainpage?page=1"
```

**Example response:**
```json
{
  "success": true,
  "provider": "hdhub4u",
  "data": {
    "results": [
      {
        "name": "Latest",
        "items": [
          { "title": "The Batman 2022 1080p", "url": "https://hdhub4u.rehab/the-batman-2022/", "posterUrl": "https://...", "type": "movie" },
          { "title": "House of the Dragon S01E01", "url": "https://hdhub4u.rehab/hotd-s01e01/", "posterUrl": "https://...", "type": "movie" }
        ]
      },
      {
        "name": "Bollywood",
        "items": [ ... ]
      }
    ]
  }
}
```

---

### 3. Search

Search for movies, series, or channels by name:

```
GET /api/:provider/search?q=batman&page=1
```

**Parameters:**
| Name | Type | Required | Default | Description |
|---|---|---|---|---|
| `q` | string | **Yes** | — | Search query (URL-encoded if needed) |
| `page` | number | No | 1 | Page number for pagination |

**Example request:**
```bash
curl "https://your-app.vercel.app/api/hindmoviez/search?q=batman"
```

**Example response:**
```json
{
  "success": true,
  "provider": "hindmoviez",
  "query": "batman",
  "data": [
    {
      "title": "The Batman (2022)",
      "url": "https://hindmoviez.cafe/the-batman-2022/",
      "posterUrl": "https://hindmoviez.cafe/wp-content/uploads/poster.jpg",
      "type": "movie"
    },
    {
      "title": "Batman: The Animated Series",
      "url": "https://hindmoviez.cafe/batman-tas/",
      "posterUrl": "https://...",
      "type": "series"
    }
  ]
}
```

---

### 4. Get Details (Movie, Series, or Channel)

Get full information about a specific item — including metadata, episodes (if series), and stream data:

```
GET /api/:provider/info?url=https://...
```

**Parameters:**
| Name | Type | Required | Description |
|---|---|---|---|
| `url` | string | **Yes** | The full URL of the content (from search or mainpage results) |

**Example request:**
```bash
# URL-encode the actual URL
curl "https://your-app.vercel.app/api/hdhub4u/info?url=https%3A%2F%2Fhdhub4u.rehab%2Fthe-batman-2022%2F"
```

**Response for a MOVIE:**
```json
{
  "success": true,
  "provider": "hdhub4u",
  "data": {
    "title": "The Batman",
    "url": "https://hdhub4u.rehab/the-batman-2022/",
    "posterUrl": "https://hdhub4u.rehab/poster.jpg",
    "backgroundUrl": "https://image.tmdb.org/t/p/original/bg.jpg",
    "year": 2022,
    "plot": "When a sadistic serial killer begins murdering key political figures in Gotham...",
    "tags": ["Action", "Crime", "Drama"],
    "rating": "7.8",
    "duration": 176,
    "actors": [
      { "name": "Robert Pattinson", "image": "https://...", "role": "Bruce Wayne" },
      { "name": "Zoë Kravitz", "image": "https://...", "role": "Selina Kyle" }
    ],
    "type": "movie",
    "trailer": "https://www.youtube.com/watch?v=...",
    "streamData": [
      "https://hdhub4u.rehab/links/1080p.mp4",
      "https://hdhub4u.rehab/links/720p.mp4"
    ]
  }
}
```

**Response for a SERIES:**
```json
{
  "success": true,
  "provider": "hdhub4u",
  "data": {
    "title": "House of the Dragon",
    "url": "https://hdhub4u.rehab/hotd/",
    "posterUrl": "https://...",
    "type": "series",
    "episodes": [
      {
        "name": "The Heirs of the Dragon",
        "season": 1,
        "episode": 1,
        "posterUrl": "https://...",
        "description": "Viserys Targaryen...",
        "streamData": [ "https://hdhub4u.rehab/links/ep1-1080p.mp4" ]
      },
      {
        "name": "The Rogue Prince",
        "season": 1,
        "episode": 2,
        "posterUrl": "https://...",
        "streamData": [ "https://hdhub4u.rehab/links/ep2-1080p.mp4" ]
      }
    ]
  }
}
```

**Response for LIVE TV:**
```json
{
  "success": true,
  "provider": "iptvplayer",
  "data": {
    "title": "Star Sports 1",
    "posterUrl": "https://logo-url.png",
    "plot": "Sports",
    "type": "live",
    "streamData": {
      "url": "https://stream.example.com/playlist.m3u8",
      "key": "deadbeef...",
      "keyid": "cafebabe..."
    }
  }
}
```

---

### 5. Get Stream Links

Convert the `streamData` from the info endpoint into actual playable stream URLs:

```
GET /api/:provider/streams?data=ENCODED_JSON
```

**Parameters:**
| Name | Type | Required | Description |
|---|---|---|---|
| `data` | string | **Yes** | JSON-encoded stream data (URL-encode it). Get this from the `streamData` field of the `/info` response, or from an episode's `streamData`. |

**Example — for a simple movie (string array):**
```bash
curl "https://your-app.vercel.app/api/hdhub4u/streams?data=%5B%22https%3A%2F%2Fhdhub4u.rehab%2Flinks%2F1080p.mp4%22%5D"
```

**Example response:**
```json
{
  "success": true,
  "provider": "hdhub4u",
  "data": [
    {
      "name": "1080p HD",
      "url": "https://cdn.example.com/stream/1080p.m3u8",
      "type": "m3u8",
      "quality": 1080,
      "referer": "https://hdhub4u.rehab/"
    },
    {
      "name": "720p HD",
      "url": "https://cdn.example.com/stream/720p.m3u8",
      "type": "m3u8",
      "quality": 720,
      "referer": "https://hdhub4u.rehab/"
    }
  ]
}
```

---

## 🎯 Complete Example Flow

Here's how to go from **zero to a playable stream** in 5 API calls:

```bash
# 1. See what's available
curl https://your-app.vercel.app/api/providers

# 2. Browse the "Latest" section on HDHub4U
curl "https://your-app.vercel.app/api/hdhub4u/mainpage?page=1"

# 3. Search for something specific
curl "https://your-app.vercel.app/api/hdhub4u/search?q=batman"

# 4. Get details (copy the 'url' field from search results)
#    The url is: https://hdhub4u.rehab/the-batman-2022/
#    URL-encode it for the API:
curl "https://your-app.vercel.app/api/hdhub4u/info?url=https%3A%2F%2Fhdhub4u.rehab%2Fthe-batman-2022%2F"

# 5. Get actual stream URLs
#    Copy the streamData array from the info response:
#    ["https://hdhub4u.rehab/links/1080p.mp4", "https://hdhub4u.rehab/links/720p.mp4"]
#    URL-encode that JSON array:
curl "https://your-app.vercel.app/api/hdhub4u/streams?data=%5B%22https%3A%2F%2Fhdhub4u.rehab%2Flinks%2F1080p.mp4%22%5D"
```

### Using it in JavaScript:

```javascript
// Step 1: Search
const searchRes = await fetch('https://your-app.vercel.app/api/hdhub4u/search?q=batman')
const searchData = await searchRes.json()
const firstResult = searchData.data[0]

// Step 2: Get details  
const infoRes = await fetch(`https://your-app.vercel.app/api/hdhub4u/info?url=${encodeURIComponent(firstResult.url)}`)
const infoData = await infoRes.json()

// Step 3: Get streams (for movies)
const streamRes = await fetch(`https://your-app.vercel.app/api/hdhub4u/streams?data=${encodeURIComponent(JSON.stringify(infoData.data.streamData))}`)
const streamData = await streamRes.json()

// streamData.data[0].url is your playable stream URL!
console.log(streamData.data[0].url)
```

---

## 🌐 Real-World Usage Examples

### Fetch all providers and search across all of them:
```javascript
async function searchAll(query) {
  const providers = await (await fetch('https://your-app.vercel.app/api/providers')).json()
  const results = await Promise.all(
    providers.data.map(p =>
      fetch(`https://your-app.vercel.app/api/${p.id}/search?q=${encodeURIComponent(query)}`)
        .then(r => r.json())
        .then(r => r.data.map(item => ({ ...item, provider: p.id })))
        .catch(() => [])
    )
  )
  return results.flat()
}
```

### Embed a video player on your website:
```html
<video id="player" controls width="100%"></video>
<script>
  async function loadMovie() {
    const info = await (await fetch('/api/hdhub4u/info?url=...')).json()
    const streams = await (await fetch('/api/hdhub4u/streams?data=' + 
      encodeURIComponent(JSON.stringify(info.data.streamData)))).json()
    document.getElementById('player').src = streams.data[0].url
  }
  loadMovie()
</script>
```

---

## 🚢 Deploy to Vercel

### Option 1: Via Vercel Dashboard (easiest)
1. Push this repo to **GitHub**
2. Go to [vercel.com/import](https://vercel.com/import)
3. Select your repo
4. Vercel **auto-detects** Next.js — just click **Deploy**
5. Done! You get a URL like `https://your-app.vercel.app`

### Option 2: Via CLI
```bash
npm i -g vercel
vercel --prod
```

---

## 💻 Run Locally

```bash
# Prerequisites: Node.js 18+
cd stream-api
npm install
npm run dev
# Open http://localhost:3000
```

---

## 📁 Project Structure

```
stream-api/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── providers/              # GET /api/providers — list all providers
│   │   │   └── [provider]/             # Dynamic route for each provider
│   │   │       ├── mainpage/           # GET /api/:provider/mainpage
│   │   │       ├── search/             # GET /api/:provider/search
│   │   │       ├── info/               # GET /api/:provider/info
│   │   │       └── streams/            # GET /api/:provider/streams
│   │   ├── layout.tsx
│   │   └── page.tsx                    # Home page with provider list
│   └── lib/
│       ├── types.ts                    # TypeScript type definitions
│       ├── fetcher.ts                  # HTTP client (uses cheerio for HTML parsing)
│       └── providers/
│           ├── index.ts                # Provider registry / router
│           ├── allmovieland.ts         # AllMovieLand provider
│           ├── animedekho.ts           # AnimeDekho provider
│           ├── animedubhindi.ts        # AnimeDubHindi provider
│           ├── hdhub4u.ts              # HDHub4U provider
│           ├── hindmoviez.ts           # Hindmoviez provider
│           ├── iptvplayer.ts           # IPTV Player provider
│           ├── multimovies.ts          # MultiMovies provider
│           ├── publicsportsiptv.ts     # PublicSportsIPTV provider
│           └── uhdmovies.ts            # UHDmovies provider
├── package.json
├── tsconfig.json
├── next.config.js                      # CORS headers enabled
└── vercel.json                         # Vercel deployment config
```

---

## ❓ FAQ

### Is this free?
**Yes.** Vercel has a generous free tier. The API itself has no usage limits.

### Can I use this commercially?
Check the terms of service of the scraped websites. This API is provided for educational purposes.

### Why do some providers fail?
Some sites use Cloudflare protection. In production, you may need to add bypass logic.

### Do I need an API key?
No authentication is required. The TMDB API key is built-in (free tier).

### How do I handle live TV streams?
For `iptvplayer` and `publicsportsiptv`, the stream URL is usually an M3U8 playlist. Use any HLS player (video.js, hls.js, etc.) to play it.

### Error responses
All errors return:
```json
{
  "success": false,
  "error": "Description of what went wrong"
}
```

Common HTTP status codes:
| Code | Meaning |
|---|---|
| `200` | Success |
| `400` | Missing required parameters |
| `404` | Provider not found |
| `500` | Server error (scraping failed, site down, etc.) |
