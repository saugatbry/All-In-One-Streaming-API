import express from 'express';
import cors from 'cors';
import searchRoutes from './src/routes/search.js';
import infoRoutes from './src/routes/info.js';
import watchRoutes from './src/routes/watch.js';
import animedekhoRoutes from './src/routes/animedekho.js';
import desidubanimeRoutes from './src/routes/desidubanime.js';
import hdhub4uRoutes from './src/routes/hdhub4u.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    name: 'Cloudstream API',
    endpoints: {
      search: '/api/search?q=<query>&provider=animedekho|desidubanime|hdhub4u',
      info: '/api/info?id=<slug>&provider=animedekho|desidubanime|hdhub4u',
      watch: '/api/watch?id=<base64ed-url-or-slug>&provider=animedekho|desidubanime|hdhub4u',
      animedekho: {
        home: '/api/animedekho/home',
        search: '/api/animedekho/search?q=',
        info: '/api/animedekho/info/:id',
        watch: '/api/animedekho/watch/:id',
      },
      desidubanime: {
        home: '/api/desidubanime/home',
        search: '/api/desidubanime/search?q=',
        info: '/api/desidubanime/info/:id',
        watch: '/api/desidubanime/watch/:id',
      },
      hdhub4u: {
        home: '/api/hdhub4u/home',
        search: '/api/hdhub4u/search?q=',
        info: '/api/hdhub4u/info/:id',
        watch: '/api/hdhub4u/watch/:id',
      },
    },
  });
});

// Provider-agnostic routes (support ?provider=desidubanime|hdhub4u)
app.use('/api/search', searchRoutes);
app.use('/api/info', infoRoutes);
app.use('/api/watch', watchRoutes);

// Provider-specific routes
app.use('/api/animedekho', animedekhoRoutes);
app.use('/api/desidubanime', desidubanimeRoutes);
app.use('/api/hdhub4u', hdhub4uRoutes);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log(`Cloudstream API running on http://localhost:${PORT}`);
});

export default app;
