import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './lib/env';
import { errorHandler, notFoundHandler } from './middleware/error';
import { UPLOAD_DIR } from './middleware/upload';
import { api } from './routes';

export function createApp() {
  const app = express();

  // Needed so rate limiting sees the real client IP behind a proxy (e.g. Vite dev proxy / nginx).
  app.set('trust proxy', 1);
  // Allow store images to be displayed by the frontend even when served from another origin.
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors({ origin: env.corsOrigins }));
  app.use(express.json({ limit: '100kb' }));

  app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '7d', index: false }));
  app.use('/api', api);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
