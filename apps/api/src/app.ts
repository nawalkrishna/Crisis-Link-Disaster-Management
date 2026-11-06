import express, { type ErrorRequestHandler, type RequestHandler } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import type { ApiError, HealthResponse } from '@crisislink/shared';
import { config } from './config';

const VERSION = '0.1.0';

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

  app.get('/api/health', (_req, res) => {
    const body: HealthResponse = {
      status: 'ok',
      service: 'crisislink-api',
      version: VERSION,
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    };
    res.json(body);
  });

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

const notFound: RequestHandler = (req, res) => {
  const body: ApiError = {
    error: { code: 'NOT_FOUND', message: `No route for ${req.method} ${req.path}` },
  };
  res.status(404).json(body);
};

// Express recognises error handlers by their 4 parameters, so `_next` must stay.
const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error(err);
  const body: ApiError = {
    // Never leak internal error details (stack traces, SQL...) to clients in production.
    error: {
      code: 'INTERNAL_ERROR',
      message:
        config.nodeEnv === 'production'
          ? 'Something went wrong'
          : String((err as Error)?.message ?? err),
    },
  };
  res.status(500).json(body);
};
