# Stream API

A REST API service that scrapes multiple streaming providers for movies, TV series, anime, live TV, and sports. Originally ported from CloudStream3 Android extensions. Deployable to **Vercel** in one click.

## Available Providers

| ID | Name | Lang | Type |
|---|---|---|---|
| `allmovieland` | AllMovieLand | hi | Movies/Series |
| `animedekho` | Anime Dekho | hi | Anime |
| `animedubhindi` | AnimeDubHindi | hi | Anime/Cartoons |
| `hdhub4u` | HDHub4U | hi | Movies/Series |
| `hindmoviez` | Hindmoviez | hi | Movies/Series |
| `iptvplayer` | IPTV Player | hi | Live TV |
| `multimovies` | MultiMovies | hi | Movies/Series |
| `publicsportsiptv` | PublicSportsIPTV | en | Live Sports |
| `uhdmovies` | UHDmovies | en | Movies/Series |

## API Endpoints

Base URL: `https://your-app.vercel.app`

### List All Providers
```
GET /api/providers
```

### Get Main Page Content
```
GET /api/:provider/mainpage?page=1
```

### Search
```
GET /api/:provider/search?q=batman&page=1
```

### Get Detailed Info (Movie/Series/Channel)
```
GET /api/:provider/info?url=https://example.com/movie-title
```

### Get Stream Links
```
GET /api/:provider/streams?data={"url":"https://..."}&data=[{"url":"..."}]
```
The `data` parameter is JSON-encoded. Use the `streamData` field from the info endpoint response.

## Example Flow

1. **List providers**: `GET /api/providers`
2. **Browse**: `GET /api/allmovieland/mainpage?page=1`
3. **Search**: `GET /api/allmovieland/search?q=batman`
4. **Get details**: `GET /api/allmovieland/info?url=https://allmovieland.you/films/batman-2022/`
5. **Get streams**: `GET /api/allmovieland/streams?data=ENCODED_STREAM_DATA`

## Sample Response

```json
{
  "success": true,
  "provider": "allmovieland",
  "data": {
    "title": "The Batman",
    "url": "https://allmovieland.you/films/batman-2022/",
    "posterUrl": "https://allmovieland.you/uploads/poster.jpg",
    "year": 2022,
    "plot": "When a sadistic serial killer...",
    "tags": ["Action", "Crime", "Drama"],
    "rating": "7.8",
    "type": "movie",
    "streamData": {
      "playerDomain": "https://player.allmovieland.you",
      "tokenKey": "abc123",
      "items": [
        { "title": "1080p", "file": "batman_1080" },
        { "title": "720p", "file": "batman_720" }
      ]
    }
  }
}
```

## Response Types

### Search Result
```typescript
{
  title: string
  url: string
  posterUrl?: string
  type: 'movie' | 'series' | 'live' | 'anime' | 'cartoon'
  quality?: string
}
```

### Media Info
```typescript
{
  title: string
  url: string
  posterUrl?: string
  backgroundUrl?: string
  year?: number
  plot?: string
  tags?: string[]
  rating?: string
  duration?: number
  type: 'movie' | 'series'
  episodes?: Episode[]
  streamData?: any
  actors?: { name: string; image?: string; role?: string }[]
}
```

### Stream Link
```typescript
{
  name: string
  url: string
  type: 'm3u8' | 'dash' | 'extractor' | 'iframe'
  quality?: number
  referer?: string
  headers?: Record<string, string>
  key?: string
  kid?: string
}
```

## Deployment to Vercel

### One-Click Deploy
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USER/stream-api)

### Manual Deploy
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### Local Development
```bash
npm install
npm run dev
# API available at http://localhost:3000/api
```

## Project Structure
```
stream-api/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── providers/          # GET /api/providers
│   │   │   └── [provider]/         # Dynamic provider routes
│   │   │       ├── mainpage/       # GET /api/:provider/mainpage
│   │   │       ├── search/         # GET /api/:provider/search
│   │   │       ├── info/           # GET /api/:provider/info
│   │   │       └── streams/        # GET /api/:provider/streams
│   │   ├── layout.tsx
│   │   └── page.tsx
│   └── lib/
│       ├── types.ts                # Shared types
│       ├── fetcher.ts              # HTTP client (cheerio-based)
│       └── providers/
│           ├── index.ts            # Provider registry
│           ├── allmovieland.ts
│           ├── animedekho.ts
│           ├── animedubhindi.ts
│           ├── hdhub4u.ts
│           ├── hindmoviez.ts
│           ├── iptvplayer.ts
│           ├── multimovies.ts
│           ├── publicsportsiptv.ts
│           └── uhdmovies.ts
├── package.json
├── tsconfig.json
├── next.config.js
└── vercel.json
```

## Notes
- All providers use server-side scraping (no browser automation)
- Some sites may have Cloudflare protection; add `CloudflareKiller`-like bypasses for production
- TMDB API key is hardcoded (free tier) - replace with your own for production use
- Rate limiting is not implemented - add if you expect high traffic
- Responses default to `utf-8` encoding with CORS headers enabled

## License
MIT
