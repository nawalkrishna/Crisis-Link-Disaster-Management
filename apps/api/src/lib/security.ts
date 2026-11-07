import type { RequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';
import type { ApiError } from '@crisislink/shared';
import { config } from '../config';
import { HttpError } from './http';

/**
 * CSRF (Cross-Site Request Forgery) protection.
 *
 * Because the browser attaches our session cookie automatically, a malicious site could try to
 * make a logged-in coordinator's browser POST to our API. Defences, in layers:
 *  1. SameSite=Lax cookie: not sent with cross-site POST/PATCH requests at all.
 *  2. This middleware: browsers always send an `Origin` header on such requests; we reject any
 *     origin that isn't our own frontend.
 *  3. We only accept JSON bodies, and cross-site JSON requests need a CORS preflight we refuse.
 */
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export const verifyOrigin: RequestHandler = (req, _res, next) => {
  if (SAFE_METHODS.has(req.method)) return next();
  const origin = req.get('origin');
  // No Origin header = not a browser cross-site request (e.g. curl, server-to-server).
  if (origin && !config.corsOrigins.includes(origin)) {
    throw new HttpError(403, 'BAD_ORIGIN', 'Request origin not allowed');
  }
  next();
};

/** State-changing requests must send JSON (blocks HTML-form based CSRF). */
export const requireJsonBody: RequestHandler = (req, _res, next) => {
  if (SAFE_METHODS.has(req.method)) return next();
  // Bodyless actions (POST /auth/logout, /tasks/:id/claim) arrive with Content-Length: 0 - fine.
  const hasBody =
    req.get('transfer-encoding') !== undefined || Number(req.get('content-length') ?? 0) > 0;
  if (hasBody && !req.is('application/json')) {
    throw new HttpError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Send the body as application/json');
  }
  next();
};

/**
 * RATE LIMITING: slow down password guessing and spam.
 * The counters live in memory, which is fine for one server; with several servers
 * you'd move them to Redis (Phase 6).
 */
function limiter(options: { windowMinutes: number; limit: number; onlyFailures?: boolean }) {
  return rateLimit({
    windowMs: options.windowMinutes * 60 * 1000,
    limit: options.limit,
    skipSuccessfulRequests: options.onlyFailures ?? false,
    standardHeaders: 'draft-8', // tells clients how long to wait (RateLimit header)
    legacyHeaders: false,
    handler: (_req, res) => {
      const body: ApiError = {
        error: { code: 'RATE_LIMITED', message: 'Too many attempts - please wait and try again' },
      };
      res.status(429).json(body);
    },
  });
}

/** 10 FAILED logins per 15 min per IP. Successful logins don't count. */
export const loginLimiter = limiter({ windowMinutes: 15, limit: 10, onlyFailures: true });
/** Sign-ups and public reports: generous for real people, painful for bots. */
export const registerLimiter = limiter({ windowMinutes: 60, limit: 10 });
export const publicSubmitLimiter = limiter({ windowMinutes: 60, limit: 30 });
/** SMS cost money and reach real phones: keep sign-up attempts per IP low. */
export const alertSignupLimiter = limiter({ windowMinutes: 60, limit: 20 });
