import { Router } from 'express';
import { infoAnimeDekho } from '../providers/animedekho.js';
import { infoDesiDubAnime } from '../providers/desidubanime.js';
import { infoHDHub4U } from '../providers/hdhub4u.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const id = req.query.id;
    if (!id) return res.status(400).json({ error: 'Parameter "id" is required' });
    const provider = req.query.provider || 'animedekho';
    const page = parseInt(req.query.page) || 1;
    let data;
    switch (provider) {
      case 'animedekho':
        data = await infoAnimeDekho(id, page);
        break;
      case 'desidubanime':
        data = await infoDesiDubAnime(id);
        break;
      case 'hdhub4u':
        data = await infoHDHub4U(id);
        break;
      default:
        return res.status(400).json({ error: `Unknown provider: ${provider}` });
    }
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
