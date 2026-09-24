import express from 'express';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.middleware';

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  const isProduction = process.env.NODE_ENV === 'production';

  // 1. Core Middleware
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json());

  // 2. Request logger (concise)
  app.use((req, _res, next) => {
    if (req.path.startsWith('/api') || req.path === '/health') {
      console.log(`[API] ${req.method} ${req.path}`);
    }
    next();
  });

  // 3. Mount Backend API Routes & Health Check
  app.use(routes);

  // 4. Vite Dev Server / Static Assets
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
    // Fallback for SPA routing in production
    app.get('*', (_req, res) => {
      res.sendFile('dist/index.html', { root: '.' });
    });
  }

  // 5. Global Error Handlers for API endpoints
  app.use('/api', notFoundHandler);
  app.use(errorHandler);

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Dhaka Tesla Pool Server running on http://0.0.0.0:${PORT}`);
    console.log(`📡 Healthcheck endpoint: http://localhost:${PORT}/health`);
    console.log(`🔐 Auth API base: http://localhost:${PORT}/api/v1/auth`);
  });
}

startServer().catch((err) => {
  console.error('Fatal error starting server:', err);
  process.exit(1);
});
