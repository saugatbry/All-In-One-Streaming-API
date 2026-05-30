import { Router } from 'express';
import { watchAnimeDekho } from '../providers/animedekho.js';
import { watchDesiDubAnime } from '../providers/desidubanime.js';
import { watchHDHub4U } from '../providers/hdhub4u.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const id = req.query.id;
    if (!id) return res.status(400).json({ error: 'Parameter "id" is required' });
    const provider = req.query.provider || 'animedekho';
    let result;
    switch (provider) {
      case 'animedekho':
        result = await watchAnimeDekho(id);
        break;
      case 'desidubanime':
        result = await watchDesiDubAnime(id);
        break;
      case 'hdhub4u':
        result = await watchHDHub4U(id);
        break;
      default:
        return res.status(400).json({ error: `Unknown provider: ${provider}` });
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
