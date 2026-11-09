/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Express application factory. Keeping the app separate from the listener makes
 * the API testable on an ephemeral port without starting the production server.
 */

import express, { type NextFunction, type Request, type Response } from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { config } from './config.ts';
import {
  securityHeaders,
  apiCacheControl,
  corsPolicy,
  sameOriginMutationGuard,
} from './middleware.ts';
import { authRouter } from './routes/auth.ts';
import { academicRouter } from './routes/academic.ts';
import { documentsRouter } from './routes/documents.ts';
import { adminRouter } from './routes/admin.ts';
import { sqlite } from './db/index.ts';

export interface CreateAppOptions {
  /** Disable the Vite middleware (used by API tests). */
  disableVite?: boolean;
}

export async function createApp(options: CreateAppOptions = {}) {
  const app = express();
  app.disable('x-powered-by');
  if (config.trustProxy) app.set('trust proxy', 1);

  app.use(securityHeaders);
  app.use(corsPolicy);
  app.use(sameOriginMutationGuard);
  app.use(express.json({ limit: config.jsonLimit }));
  app.use(express.urlencoded({ extended: true, limit: config.jsonLimit }));

  // Never cache API responses (personal data and moderation state).
  app.use('/api', apiCacheControl);

  app.get('/api/health', (_req: Request, res: Response) => {
    try {
      sqlite.prepare('SELECT 1 AS ok').get();
      return res.json({
        status: 'healthy',
        platform: 'MTA University Library Collector',
        developer: 'MTA TECHNOLOGIES',
        version: '1.0.0',
        database: 'connected',
        environment: config.nodeEnv,
        timestamp: new Date().toISOString(),
      });
    } catch {
      return res.status(503).json({ status: 'degraded', database: 'unavailable' });
    }
  });

  app.use('/api/auth', authRouter);
  app.use('/api/academic', academicRouter);
  app.use('/api/documents', documentsRouter);
  app.use('/api/admin', adminRouter);

  // Direct download route for the authoritative project ZIP archive
  app.get('/MTA-University-Library-Collector-v1.0.0-final.zip', (_req: Request, res: Response) => {
    const zipPath = path.resolve(config.projectRoot, 'public', 'MTA-University-Library-Collector-v1.0.0-final.zip');
    if (fs.existsSync(zipPath)) {
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', 'attachment; filename="MTA-University-Library-Collector-v1.0.0-final.zip"');
      return res.sendFile(zipPath);
    }
    return res.status(404).send('Archive not found');
  });

  app.use('/api', (_req: Request, res: Response) => {
    return res.status(404).json({ error: 'API endpoint not found' });
  });

  const serveVite =
    !options.disableVite && !config.isProduction && process.env.MTA_DISABLE_VITE !== '1';

  if (serveVite) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(config.projectRoot, 'dist');
    if (!fs.existsSync(distDir)) {
      app.get('/', (_req: Request, res: Response) => {
        res
          .status(503)
          .type('text/plain')
          .send('Frontend build not found. Run `bun run build` before starting in production mode.');
      });
    } else {
      app.use(
        express.static(distDir, {
          index: false,
          setHeaders: (res, filePath) => {
            if (filePath.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache');
            else if (/\.[a-f0-9]{8,}\.(js|css|woff2?|png|jpg|svg)$/i.test(filePath)) {
              res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
            }
          },
        }),
      );
      app.get('*', (req: Request, res: Response, next: NextFunction) => {
        if (req.path.startsWith('/api/')) return next();
        return res.sendFile(path.join(distDir, 'index.html'));
      });
    }
  }

  // Central error handler: never leak stack traces or internal paths.
  app.use((err: Error & { status?: number; code?: string }, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status && err.status >= 400 && err.status < 600 ? err.status : 500;
    if (status >= 500) console.error('[server] unhandled error:', err.message);
    if (res.headersSent) return;
    res.status(status).json({
      error: status >= 500 ? 'Internal server error' : err.message || 'Request rejected',
    });
  });

  return app;
}
