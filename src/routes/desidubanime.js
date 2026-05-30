import { Router } from 'express';
import { getHome, searchDesiDubAnime, infoDesiDubAnime, watchDesiDubAnime } from '../providers/desidubanime.js';

// ===== In-Memory TTL Cache =====
const cache = new Map();
const CACHE_TTL = {
  home: 3_600_000,   // 1 hour
  search: 1_800_000, // 30 min
  info: 86_400_000,  // 24 hours
  watch: 1_800_000,  // 30 min
};

function getCached(key) {
  const entry = cache.get(key);
  if (entry && Date.now() < entry.expiry) return entry.data;
  cache.delete(key);
  return null;
}

function setCache(key, data, ttl) {
  cache.set(key, { data, expiry: Date.now() + ttl });
  // Evict old entries if map grows too large
  if (cache.size > 500) {
    const oldest = [...cache.entries()].sort((a, b) => a[1].expiry - b[1].expiry)[0];
    if (oldest) cache.delete(oldest[0]);
  }
}

const router = Router();

// GET /api/desidubanime/home
router.get('/home', async (req, res) => {
  try {
    const cached = getCached('ddb:home');
    if (cached) return res.json(cached);
    const data = await getHome();
    setCache('ddb:home', data, CACHE_TTL.home);
    res.json(data);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/desidubanime/search?q=
router.get('/search', async (req, res) => {
  try {
    const q = req.query.q;
    if (!q) return res.status(400).json({ success: false, error: 'Missing "q" query parameter' });
    const cacheKey = `ddb:search:${q}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);
    const data = await searchDesiDubAnime(q);
    setCache(cacheKey, data, CACHE_TTL.search);
    res.json(data);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/desidubanime/info/:id
router.get('/info/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const cacheKey = `ddb:info:${id}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);
    const data = await infoDesiDubAnime(id);
    setCache(cacheKey, data, CACHE_TTL.info);
    res.json(data);
  } catch (error) {
    const status = error.message?.includes('404') ? 404 : 500;
    res.status(status).json({ success: false, error: error.message });
  }
});

// GET /api/desidubanime/watch/:id
router.get('/watch/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const cacheKey = `ddb:watch:${id}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);
    const data = await watchDesiDubAnime(id);
    setCache(cacheKey, data, CACHE_TTL.watch);
    res.json(data);
  } catch (error) {
    const status = error.message?.includes('404') ? 404 : 500;
    res.status(status).json({ success: false, error: error.message });
  }
});

// Integration with existing provider-agnostic routes
// GET /api/search?q=&provider=desidubanime
router.get('/legacy-search', async (req, res) => {
  try {
    const q = req.query.q;
    if (!q) return res.status(400).json({ error: 'Query parameter "q" is required' });
    const { results } = await searchDesiDubAnime(q);
    res.json({ success: true, results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/info?id=&provider=desidubanime
router.get('/legacy-info', async (req, res) => {
  try {
    const id = req.query.id;
    if (!id) return res.status(400).json({ error: 'Parameter "id" is required' });
    const data = await infoDesiDubAnime(id);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/watch?id=&provider=desidubanime
router.get('/legacy-watch', async (req, res) => {
  try {
    const id = req.query.id;
    if (!id) return res.status(400).json({ error: 'Parameter "id" is required' });
    const data = await watchDesiDubAnime(id);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
