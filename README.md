# Cloudstream API

Node.js Express streaming API with multi-provider support for Hindi-dubbed movies, TV series, and anime content. Replicates Cloudstream Kotlin extractors as REST endpoints.

## Features

- **3 providers**: AnimeDekho, DesiDubAnime, HDHub4U
- **17+ extractors**: HubCloud, VidStack, StreamWish, StreamTape, GDFlix, GDMirrorbot, FileMoon, StreamRuby, VidHide, VidMoly, Abyss, AWSStream, and more
- **Dynamic domain resolution**: HDHub4U auto-resolves working domains via GitHub config
- **TMDB enrichment**: Cast, backdrop, genres, ratings, episode metadata (HDHub4U)
- **AES-128-CBC decryption**: For encrypted VidStack streams
- **Redirect decoding**: Triple base64/ROT13 pipeline for bypass links
- **TTL caching**: In-memory cache on all endpoints (home: 1h, search: 30m, info: 24h, watch: 30m)
- **Content types**: Bollywood, Hollywood, Hindi Dubbed, South Indian, Web Series, Anime

## Quick Start

```bash
npm install
npm start
```

Server runs on `http://localhost:3000`. Set `PORT` env to change.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |

## Endpoints Overview

Each provider exposes `home`, `search`, `info`, and `watch` endpoints.

| Provider | Base Path | Content |
|----------|-----------|---------|
| **animedekho** | `/api/animedekho/*` | Anime (Hindi/Tamil/Telugu dubbed) |
| **desidubanime** | `/api/desidubanime/*` | Hindi dubbed anime |
| **hdhub4u** | `/api/hdhub4u/*` | Bollywood, Hollywood, Hindi Dubbed, South, Web Series, Anime |

Provider-agnostic fallback routes also exist: `/api/search`, `/api/info`, `/api/watch` with `?provider=` parameter.

---

## AnimeDekho

### GET /api/animedekho/home

Returns up to 30 latest anime from the homepage.

```bash
curl http://localhost:3000/api/animedekho/home
```

**Response:**
```json
{
  "success": true,
  "results": [
    {
      "id": "dr-stone",
      "title": "Dr. STONE",
      "type": "anime",
      "poster": "https://image.tmdb.org/t/p/w1280/..."
    },
    {
      "id": "fullmetal-alchemist-brotherhood",
      "title": "Fullmetal Alchemist: Brotherhood",
      "type": "anime"
    }
  ]
}
```

### GET /api/animedekho/search?q=<query>

```bash
curl "http://localhost:3000/api/animedekho/search?q=naruto"
```

**Response:**
```json
[
  {
    "provider": "animedekho",
    "id": "naruto-shippuden-hindi-tamil-telugu",
    "title": "Naruto Shippūden",
    "type": "anime",
    "poster": "https://image.tmdb.org/t/p/w500/rXD6lcg6zhRE8NDRVlQPNkViC3s.jpg"
  },
  {
    "provider": "animedekho",
    "id": "naruto-the-movie-ninja-clash-in-the-land-of-snow",
    "title": "Naruto the Movie: Ninja Clash in the Land of Snow",
    "type": "anime",
    "poster": "https://image.tmdb.org/t/p/w342/..."
  },
  {
    "provider": "animedekho",
    "id": "naruto",
    "title": "Naruto",
    "type": "anime",
    "poster": "https://image.tmdb.org/t/p/w500/..."
  }
]
```

### GET /api/animedekho/info/:id

For **series** — includes season/episode listing with pagination (50 per page).

```bash
curl http://localhost:3000/api/animedekho/info/naruto-shippuden-hindi-tamil-telugu
curl http://localhost:3000/api/animedekho/info/naruto-shippuden-hindi-tamil-telugu?page=2
```

**Response (series):**
```json
{
  "provider": "animedekho",
  "id": "naruto-shippuden-hindi-tamil-telugu",
  "title": "Naruto Shippūden",
  "type": "anime",
  "poster": "https://image.tmdb.org/t/p/w500/rXD6lcg6zhRE8NDRVlQPNkViC3s.jpg",
  "description": "After 2 and a half years Naruto finally returns...",
  "year": 2007,
  "seasons": [
    "Season 1 February 15, 2007",
    "Season 2 November 9, 2007"
  ],
  "totalEpisodes": 360,
  "currentPage": 1,
  "totalPages": 8,
  "more_page": true,
  "episodes": [
    {
      "name": "Homecoming",
      "season": 1,
      "episode": 1,
      "id": "eyJ1cmwiOiJodHRwczovL2FuaW1lZGVraG8uYXBwL2VwaS9uYXJ1dG8tc2hpcHB1ZGVuLTF4MS8iLCJtZWRpYVR5cGUiOjJ9",
      "thumbnail": "https://image.tmdb.org/t/p/w185/lFg0YnHI7sJkPSv38a8ctE96sqr.jpg"
    },
    {
      "name": "The Akatsuki Makes Its Move",
      "season": 1,
      "episode": 2,
      "id": "eyJ1cmwiOiJodHRwczovL2FuaW1lZGVraG8uYXBwL2VwaS9uYXJ1dG8tc2hpcHB1ZGVuLTF4Mi8iLCJtZWRpYVR5cGUiOjJ9",
      "thumbnail": "https://image.tmdb.org/t/p/w185/..."
    }
  ]
}
```

For **movie** — minimal response (no episodes).

```bash
curl http://localhost:3000/api/animedekho/info/naruto-the-movie-ninja-clash-in-the-land-of-snow
```

**Response (movie):**
```json
{
  "provider": "animedekho",
  "id": "naruto-the-movie-ninja-clash-in-the-land-of-snow",
  "title": "Naruto the Movie: Ninja Clash in the Land of Snow",
  "type": "movie",
  "poster": "https://...",
  "description": "Watch Naruto the Movie...",
  "year": 2025
}
```

### GET /api/animedekho/watch/:id

The `id` is a base64-encoded JSON object `{"url":"...","mediaType":2}` from an episode's `id` field.

```bash
curl http://localhost:3000/api/animedekho/watch/eyJ1cmwiOiJodHRwczovL2FuaW1lZGVraG8uYXBwL2VwaS9uYXJ1dG8tc2hpcHB1ZGVuLTF4MS8iLCJtZWRpYVR5cGUiOjJ9
```

**Response:**
```json
{
  "sources": [
    {
      "url": "https://...master.m3u8?...",
      "quality": "720p",
      "server": "Vidmoly",
      "type": "hls",
      "headers": { "Referer": "https://vidmoly.biz/embed-..." }
    },
    {
      "url": "http://.../v4/.../...",
      "quality": "auto",
      "server": "VidStack",
      "type": "direct"
    }
  ],
  "subtitles": [
    { "lang": "English", "url": "https://..." }
  ]
}
```

---

## DesiDubAnime

### GET /api/desidubanime/home

```bash
curl http://localhost:3000/api/desidubanime/home
```

**Response:**
```json
{
  "success": true,
  "results": [
    {
      "id": "naruto-shippuuden",
      "title": "Naruto: Shippuden",
      "type": "series"
    },
    {
      "id": "one-piece",
      "title": "One Piece",
      "type": "series"
    }
  ]
}
```

### GET /api/desidubanime/search?q=<query>

```bash
curl "http://localhost:3000/api/desidubanime/search?q=naruto"
```

**Response:**
```json
{
  "success": true,
  "results": [
    {
      "id": "naruto-shippuuden",
      "title": "Naruto: Shippuden",
      "type": "anime",
      "poster": "https://cdn.myanimelist.net/images/anime/1565/111305l.jpg"
    },
    {
      "id": "naruto",
      "title": "Naruto",
      "type": "anime",
      "poster": "https://cdn.myanimelist.net/images/anime/1141/142503l.jpg"
    }
  ]
}
```

### GET /api/desidubanime/info/:id

```bash
curl http://localhost:3000/api/desidubanime/info/naruto-shippuuden
```

**Response:**
```json
{
  "success": true,
  "data": {
    "title": "Naruto: Shippuden",
    "id": "naruto-shippuuden",
    "poster": "https://...",
    "description": "...",
    "year": 2007,
    "rating": 8.5,
    "genres": ["Action", "Adventure"],
    "totalEpisodes": 500,
    "episodes": [
      { "number": 1, "id": "...", "title": "Homecoming", "thumbnail": "https://..." }
    ]
  }
}
```

### GET /api/desidubanime/watch/:id

```bash
curl http://localhost:3000/api/desidubanime/watch/<episode-id>
```

**Response:**
```json
{
  "sources": [
    { "url": "https://...", "quality": "1080p", "server": "HubCloud", "type": "hls" }
  ],
  "subtitles": []
}
```

---

## HDHub4U

### GET /api/hdhub4u/home?page=1

Returns categorized home page with Latest, Bollywood, Hollywood, Hindi Dubbed, South Hindi Dubbed, Web Series, and Anime sections.

```bash
curl "http://localhost:3000/api/hdhub4u/home?page=1"
```

**Response:**
```json
{
  "success": true,
  "results": [
    {
      "name": "Latest",
      "items": [
        {
          "id": "kattalan-2026-hindi-line-hdtc-full-movie",
          "title": "Kattalan (2026)",
          "poster": "https://image.tmdb.org/t/p/w342/...",
          "type": "movie",
          "quality": "1080p"
        },
        {
          "id": "murder-mindfully-season-2-webrip-hindi-full-series",
          "title": "Murder Mindfully",
          "poster": "https://image.tmdb.org/t/p/w342/...",
          "type": "series",
          "quality": "1080p"
        }
      ]
    },
    {
      "name": "Bollywood",
      "items": [ "...same shape..." ]
    }
  ]
}
```

### GET /api/hdhub4u/search?q=<query>

```bash
curl "http://localhost:3000/api/hdhub4u/search?q=batman"
```

**Response:**
```json
{
  "success": true,
  "results": [
    {
      "id": "batman-begins-2005-bluray-hindi-dd2-0-english-dual-audio-x264-full-movie",
      "title": "Batman Begins (2005) BluRay [Hindi (DD2.0) & English] 1080p 720p & 480p Dual Audio [x264] | Full Movie",
      "poster": "https://image.tmdb.org/t/p/w400/...",
      "type": "movie",
      "quality": "300MB Movies"
    }
  ]
}
```

### GET /api/hdhub4u/info/:id

Returns movie or series info with TMDB enrichment (cast, backdrop, genres, rating) and direct download links.

For **movies** — includes a `downloads` array with quality/size/filehost + a `watchId` for streaming.

```bash
curl http://localhost:3000/api/hdhub4u/info/kalki-2898-ad-2024-hindi-full-movie
```

**Response (movie):**
```json
{
  "success": true,
  "id": "kalki-2898-ad-2024-hindi-full-movie",
  "title": "Kalki 2898 AD (2024)",
  "poster": "https://image.tmdb.org/t/p/w342/...",
  "banner": "https://image.tmdb.org/t/p/w1280/...",
  "description": "...",
  "type": "movie",
  "genres": ["Action", "Sci-Fi"],
  "year": 2024,
  "rating": 8.5,
  "cast": [{ "name": "Prabhas", "image": "https://...", "role": "Bhairava" }],
  "duration": 181,
  "trailer": "https://www.youtube.com/watch?v=...",
  "quality": "1080p",
  "downloads": [
    { "quality": "1080p", "size": "5.2 GB", "url": "https://...", "filehost": "HubCloud" },
    { "quality": "720p", "size": "1.8 GB", "url": "https://...", "filehost": "GDFlix" }
  ],
  "watchId": "WjBweWQyeGxaV3hwYzNSeVpXeGxPbDl6Wlhrd2VERTViMnB6YkhGMVpIcG5TV3RzY0d..."
}
```

For **series** — includes `episodes` array.

```bash
curl http://localhost:3000/api/hdhub4u/info/absolute-value-of-romance-season-1-webrip-hindi-full-series
```

**Response (series):**
```json
{
  "success": true,
  "id": "absolute-value-of-romance-season-1-webrip-hindi-full-series",
  "title": "Absolute Value of Romance",
  "type": "series",
  "poster": "https://...",
  "description": "...",
  "genres": ["Romance", "Drama"],
  "year": 2026,
  "rating": 8.0,
  "cast": [...],
  "episodes": [
    {
      "id": "base64-encoded-url-array",
      "number": 1,
      "title": "Episode 1",
      "thumbnail": "https://image.tmdb.org/t/p/w185/...",
      "airDate": "2026-01-15",
      "description": "Episode description from TMDB..."
    }
  ]
}
```

### GET /api/hdhub4u/watch/:watchId

The `watchId` is a base64-encoded JSON array of URLs from the info response.

```bash
curl http://localhost:3000/api/hdhub4u/watch/<watchId>
```

**Response:**
```json
{
  "success": true,
  "sources": [
    {
      "server": "HubCloud",
      "url": "https://...",
      "quality": "1080p",
      "type": "hls",
      "isM3U8": true,
      "headers": { "Referer": "https://...", "User-Agent": "..." }
    },
    {
      "server": "HUBCDN",
      "url": "https://...",
      "quality": "1080p",
      "type": "direct"
    }
  ],
  "subtitles": [
    { "lang": "English", "url": "https://..." }
  ]
}
```

---

## Provider-Agnostic Routes

These routes accept a `?provider=` parameter and work as fallbacks.

### GET /api/search?q=<query>&provider=<provider>

```bash
curl "http://localhost:3000/api/search?q=naruto&provider=animedekho"
curl "http://localhost:3000/api/search?q=naruto&provider=desidubanime"
curl "http://localhost:3000/api/search?q=kalki&provider=hdhub4u"
```

**Response:** `{ "success": true, "results": [...] }`

### GET /api/info?id=<slug>&provider=<provider>

```bash
curl "http://localhost:3000/api/info?id=naruto-shippuden-hindi-tamil-telugu&provider=animedekho"
curl "http://localhost:3000/api/info?id=naruto-shippuuden&provider=desidubanime"
curl "http://localhost:3000/api/info?id=kalki-2898-ad-2024-hindi-full-movie&provider=hdhub4u"
```

**Response:** `{ "success": true, "data": { ... } }`

### GET /api/watch?id=<id>&provider=<provider>

```bash
curl "http://localhost:3000/api/watch?id=eyJ1cmwiOiJodHRwczovL2FuaW1lZGVraG8uYXBwL2VwaS9uYXJ1dG8tc2hpcHB1ZGVuLTF4MS8iLCJtZWRpYVR5cGUiOjJ9&provider=animedekho"
```

**Response:** `{ "sources": [...], "subtitles": [...] }`

---

## Caching

All endpoints use in-memory TTL caching:

| Endpoint | Cache TTL |
|----------|-----------|
| Home | 1 hour |
| Search | 30 minutes |
| Info | 24 hours |
| Watch | 30 minutes |

Cache is per-provider (e.g., `hdhub4u:home`, `animedekho:search:naruto`). Automatically evicts oldest entries when exceeding 500 cached items.

---

## Architecture

```
src/
  providers/       # Content source implementations
    hdhub4u.js     # HDHub4U: categorized home, TMDB-enriched info, downloads, watch
    desidubanime.js # DesiDubAnime: home, search, info, watch
    animedekho.js  # AnimeDekho: home, search, info, watch
  extractors/      # Media host resolvers
    index.js       # Resolver router with extractor map
    hubcloud.js    # HubCloud
    vidstack.js    # VidStack AES-128-CBC decryption
    hubdrive.js    # HubDrive redirect decoder
    hubcdn.js      # HubCDN base64 decode
    streamtape.js  # StreamTape API ticket + M3U8 fallback
    streamwish.js  # StreamWish embeds
    gdflix.js      # GDFlix multi-CDN sources
    gdmirrorbot.js # GDMirrorbot API
    filemoon.js    # FileMoon
    streamruby.js  # StreamRuby
    vidhide.js     # VidHide
    vidmoly.js     # VidMoly
    abyss.js       # Abyss
    awsstream.js   # AWSStream
    gofile.js      # GoFile API
  routes/          # Express route handlers with per-provider caching
    animedekho.js
    desidubanime.js
    hdhub4u.js
    search.js      # Provider-agnostic search
    info.js        # Provider-agnostic info
    watch.js       # Provider-agnostic watch
  utils/
    request.js     # Axios HTTP client (fetchPage, fetchJSON, postPage)
    helpers.js     # base64, rot13, quality detection, title cleaning
    crypto.js      # AES-128-CBC decryption (VidStack)
```

## Dynamic Domain System (HDHub4U)

HDHub4U changes domains frequently. The provider auto-resolves from:

```
https://raw.githubusercontent.com/phisher98/TVVVV/refs/heads/main/domains.json
```

Key `HDHUB4u` in the JSON maps to the current content domain. Fallback: `https://new1.hdhub4u.limo`.

## License

MIT
