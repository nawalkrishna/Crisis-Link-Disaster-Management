import express, { Router } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import type { HealthResponse } from '@crisislink/shared';
import { config } from './config';
import { prisma } from './db';
import { loadSession } from './auth/session';
import { errorHandler, notFoundHandler } from './lib/errors';
import { requireJsonBody, verifyOrigin } from './lib/security';
import { alertsRouter } from './routes/alerts';
import { authRouter } from './routes/auth';
import { campsRouter } from './routes/camps';
import { geoRouter } from './routes/geo';
import { donationsRouter } from './routes/donations';
import { evacueesRouter } from './routes/evacuees';
import { incidentsRouter } from './routes/incidents';
import { needsRouter } from './routes/needs';
import { overviewRouter } from './routes/overview';
import { tasksRouter } from './routes/tasks';
import { usersRouter } from './routes/users';

const VERSION = '0.5.0';

/**
 * Builds the Express app WITHOUT starting a server.
 * Keeping "build the app" separate from "listen on a port" means tests can
 * exercise the app directly (we'll use that in Phase 6).
 */
export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  // Behind a hosting proxy, trust its X-Forwarded-For so req.ip (used by rate limits) is the real client.
  app.set('trust proxy', config.trustProxy);
  app.use(helmet()); // sensible security headers
  // Only our frontend may call us from a browser; `credentials` allows the session cookie.
  app.use(cors({ origin: config.corsOrigins, credentials: true }));
  app.use(verifyOrigin); // CSRF: reject state-changing requests from other sites
  app.use(requireJsonBody);
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());
  app.use(loadSession); // sets req.user when a valid session cookie is present

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

  api.use(authRouter);
  api.use(usersRouter);
  api.use(overviewRouter);
  api.use(geoRouter); // before campsRouter, so /camps/nearby isn't read as /camps/:id
  api.use(campsRouter);
  api.use(evacueesRouter);
  api.use(needsRouter);
  api.use(donationsRouter);
  api.use(incidentsRouter);
  api.use(tasksRouter);
  api.use(alertsRouter);

  app.use('/api', api);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
