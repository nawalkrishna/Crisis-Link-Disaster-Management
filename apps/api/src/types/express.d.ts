/**
 * "Declaration merging": we add our own fields to Express's Request type,
 * so `req.user` is typed everywhere without casts.
 */
import type { AuthUser } from '../auth/session';

declare global {
  namespace Express {
    interface Request {
      /** Set by loadSession when the request carries a valid session cookie. */
      user?: AuthUser;
      /** Hash of the current session token (the sessions.id primary key). */
      sessionId?: string;
    }
  }
}

export {};
