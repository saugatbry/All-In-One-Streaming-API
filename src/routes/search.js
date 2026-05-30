import { Router } from 'express';
import { searchAnimeDekho } from '../providers/animedekho.js';
import { searchDesiDubAnime } from '../providers/desidubanime.js';
import { searchHDHub4U } from '../providers/hdhub4u.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const q = req.query.q;
    if (!q) return res.status(400).json({ error: 'Query parameter "q" is required' });
    const provider = req.query.provider || 'animedekho';
    let results;
    switch (provider) {
      case 'animedekho':
        results = await searchAnimeDekho(q);
        break;
      case 'desidubanime':
        results = (await searchDesiDubAnime(q)).results;
        break;
      case 'hdhub4u':
        results = (await searchHDHub4U(q)).results;
        break;
      default:
        return res.status(400).json({ error: `Unknown provider: ${provider}` });
    }
    res.json({ success: true, results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
