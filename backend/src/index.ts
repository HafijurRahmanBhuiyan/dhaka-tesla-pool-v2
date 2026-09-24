import express from 'express';
import cors from 'cors';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.middleware';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Request logging
app.use((req, _res, next) => {
  console.log(`[API] ${req.method} ${req.path}`);
  next();
});

// Routes
app.use(routes);

// Error Handlers
app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Dhaka Tesla Pool API listening on port ${PORT}`);
  console.log(`📡 Healthcheck endpoint: http://0.0.0.0:${PORT}/health`);
});
