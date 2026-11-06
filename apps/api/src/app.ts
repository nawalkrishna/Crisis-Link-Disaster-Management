import express, { Router } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import type { HealthResponse } from '@crisislink/shared';
import { config } from './config';
import { prisma } from './db';
import { errorHandler, notFoundHandler } from './lib/errors';
import { campsRouter } from './routes/camps';
import { donationsRouter } from './routes/donations';
import { evacueesRouter } from './routes/evacuees';
import { incidentsRouter } from './routes/incidents';
import { needsRouter } from './routes/needs';
import { overviewRouter } from './routes/overview';

const VERSION = '0.2.0';

/**
 * Builds the Express app WITHOUT starting a server.
 * Keeping "build the app" separate from "listen on a port" means tests can
 * exercise the app directly (we'll use that in Phase 6).
 */
export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet()); // sensible security headers
  app.use(cors({ origin: config.corsOrigins })); // only our frontend may call us from a browser
  app.use(express.json({ limit: '100kb' }));

  const api = Router();

  api.get('/health', async (_req, res) => {
    // A health check that also proves the database is reachable.
    const database = await prisma.$queryRaw`SELECT 1`.then(
      () => 'up' as const,
      () => 'down' as const,
    );
    const body: HealthResponse = {
      status: database === 'up' ? 'ok' : 'degraded',
      service: 'crisislink-api',
      version: VERSION,
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
      database,
    };
    res.status(database === 'up' ? 200 : 503).json(body);
  });

  api.use(overviewRouter);
  api.use(campsRouter);
  api.use(evacueesRouter);
  api.use(needsRouter);
  api.use(donationsRouter);
  api.use(incidentsRouter);

  app.use('/api', api);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
