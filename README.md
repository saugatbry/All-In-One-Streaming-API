# Cloudstream API

Node.js Express streaming API replicating Cloudstream Kotlin extractors for Hindi-dubbed movies, TV series, and anime content.

## Features

- **Multi-provider support**: HDHub4U, DesiDubAnime, AnimeDekho
- **17+ extractors**: HubCloud, VidStack, StreamWish, GDFlix, GDMirrorbot, FileMoon, StreamRuby, VidHide, VidMoly, Abyss, AWSStream, StreamTape, PixelDrain, and more
- **Dynamic domain resolution**: Automatically resolves current working domains via GitHub config
- **TMDB enrichment**: Cast, backdrop, genres, ratings, episode metadata
- **AES-128-CBC decryption**: For encrypted video sources (VidStack)
- **Redirect decoding**: Triple base64/ROT13 pipeline for bypass links
- **Caching**: In-memory TTL cache on all endpoints
- **Content types**: Movies, TV series, anime, Hindi dubbed content

## Providers

| Provider | Endpoints | Content |
|----------|-----------|---------|
| **hdhub4u** | `/api/hdhub4u/*` | Bollywood, Hollywood, Hindi Dubbed, South Hindi Dubbed, Web Series, Anime |
| **desidubanime** | `/api/desidubanime/*` | Hindi dubbed anime |
| **animedekho** | `/api/search?provider=animedekho` | Anime (via provider-agnostic routes) |

## Quick Start

```bash
npm install
npm start
```

Server runs on `http://localhost:3000` by default. Set `PORT` env to change.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `HDHUB4U_URL` | `(dynamic)` | Override HDHub4U base URL |

## API Endpoints

### Provider-Specific Routes

#### HDHub4U

```bash
# Home - categories with latest items
GET /api/hdhub4u/home?page=1

# Search
GET /api/hdhub4u/search?q=<query>

# Info - movie/series details with TMDB enrichment
GET /api/hdhub4u/info/:slug

# Watch - streaming sources with extractor resolution
GET /api/hdhub4u/watch/:episodeId
```

#### DesiDubAnime

```bash
GET /api/desidubanime/home
GET /api/desidubanime/search?q=
GET /api/desidubanime/info/:id
GET /api/desidubanime/watch/:id
```

### Provider-Agnostic Routes

```bash
# Search across providers
GET /api/search?q=<query>&provider=animedekho|desidubanime|hdhub4u

# Info
GET /api/info?id=<slug>&provider=animedekho|desidubanime|hdhub4u

# Watch
GET /api/watch?id=<base64-or-slug>&provider=animedekho|desidubanime|hdhub4u
```

## Response Formats

### Home

```json
{
  "success": true,
  "results": [
    {
      "name": "Latest",
      "items": [
        { "id": "movie-slug", "title": "Movie Title (2026)", "poster": "https://...", "type": "movie", "quality": "1080p" }
      ]
    }
  ]
}
```

### Search

```json
{
  "success": true,
  "results": [
    { "id": "slug", "title": "...", "poster": "...", "type": "movie|series|anime", "quality": "1080p" }
  ]
}
```

### Info

```json
{
  "success": true,
  "id": "slug",
  "title": "Movie/Series Title",
  "poster": "https://...",
  "banner": "https://...",
  "description": "...",
  "type": "movie|series|anime",
  "genres": ["Action", "Drama"],
  "year": 2026,
  "rating": 7.8,
  "cast": [{ "name": "Actor", "image": "https://...", "role": "Character" }],
  "trailer": "https://youtube.com/...",
  "duration": 148,
  "episodes": [
    { "id": "<base64>", "number": 1, "title": "Episode 1", "thumbnail": "https://...", "airDate": "2026-01-15" }
  ]
}
```

### Watch

```json
{
  "success": true,
  "sources": [
    {
      "server": "HubCloud [FSL Server]",
      "url": "https://...",
      "quality": "1080p",
      "type": "hls|direct",
      "isM3U8": true,
      "headers": { "Referer": "https://...", "User-Agent": "..." }
    }
  ],
  "subtitles": [
    { "lang": "English", "url": "https://..." }
  ]
}
```

## Architecture

```
src/
  providers/       # Content source implementations
    hdhub4u.js     # HDHub4U: home, search, info, watch
    desidubanime.js
    animedekho.js
  extractors/      # Media file host resolvers
    index.js       # Resolver router
    hubcloud.js    # HubCloud file host
    vidstack.js    # VidStack AES-encrypted streams
    hubdrive.js    # HubDrive redirects
    hubcdn.js      # HubCDN base64 decode
    streamtape.js  # StreamTape API + fallback
    streamwish.js  # StreamWish embeds
    gdflix.js      # GDFlix with multiple CDN sources
    gdmirrorbot.js # GDMirrorbot API
    gofile.js      # GoFile API
    pixeldrain.js  # (in index.js) PixelDrain direct
    ...and more
  routes/          # Express route handlers with caching
  utils/
    request.js     # Axios HTTP client with retries
    helpers.js     # String/crypto utilities
    crypto.js      # AES-128-CBC decryption
```

## Dynamic Domain System

HDHub4U and related sites change domains frequently. The provider automatically resolves the current domain from:

```
https://raw.githubusercontent.com/phisher98/TVVVV/refs/heads/main/domains.json
```

No manual updates needed when domains change.

## License

MIT
