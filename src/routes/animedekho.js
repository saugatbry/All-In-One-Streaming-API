import { Router } from 'express';
import { getHome, searchAnimeDekho, infoAnimeDekho, watchAnimeDekho } from '../providers/animedekho.js';

const cache = new Map();
const CACHE_TTL = {
  home: 3_600_000,
  search: 1_800_000,
  info: 86_400_000,
  watch: 1_800_000,
};

function getCached(key) {
  const entry = cache.get(key);
  if (entry && Date.now() < entry.expiry) return entry.data;
  cache.delete(key);
  return null;
}

function setCache(key, data, ttl) {
  cache.set(key, { data, expiry: Date.now() + ttl });
  if (cache.size > 500) {
    const oldest = [...cache.entries()].sort((a, b) => a[1].expiry - b[1].expiry)[0];
    if (oldest) cache.delete(oldest[0]);
  }
}

const router = Router();

router.get('/home', async (req, res) => {
  try {
    const cached = getCached('anime:home');
    if (cached) return res.json(cached);
    const data = await getHome();
    setCache('anime:home', data, CACHE_TTL.home);
    res.json(data);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/search', async (req, res) => {
  try {
    const q = req.query.q;
    if (!q) return res.status(400).json({ success: false, error: 'Missing "q" query parameter' });
    const key = `anime:search:${q}`;
    const cached = getCached(key);
    if (cached) return res.json(cached);
    const data = await searchAnimeDekho(q);
    setCache(key, data, CACHE_TTL.search);
    res.json(data);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/info/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const key = `anime:info:${id}`;
    const cached = getCached(key);
    if (cached) return res.json(cached);
    const data = await infoAnimeDekho(id);
    setCache(key, data, CACHE_TTL.info);
    res.json(data);
  } catch (error) {
    const status = error.message?.includes('404') ? 404 : 500;
    res.status(status).json({ success: false, error: error.message });
  }
});

router.get('/watch/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const key = `anime:watch:${id}`;
    const cached = getCached(key);
    if (cached) return res.json(cached);
    const data = await watchAnimeDekho(id);
    setCache(key, data, CACHE_TTL.watch);
    res.json(data);
  } catch (error) {
    const status = error.message?.includes('404') ? 404 : 500;
    res.status(status).json({ success: false, error: error.message });
  }
});

export default router;
