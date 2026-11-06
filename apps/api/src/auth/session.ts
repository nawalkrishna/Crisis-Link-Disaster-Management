import { createHash, randomBytes } from 'node:crypto';
import type { CookieOptions, Request, RequestHandler, Response } from 'express';
import type { CurrentUser } from '@crisislink/shared';
import { config } from '../config';
import { prisma } from '../db';
import type { Prisma } from '../generated/prisma/client';

/**
 * SESSION-BASED AUTH (why not JWT?)
 *
 * After login the server creates a random token, stores its hash in the `sessions` table and
 * sends the token in an httpOnly cookie. Every request looks the session up.
 *  + Logout, "log out other devices", suspending a user and password changes take effect
 *    IMMEDIATELY - we just delete rows. A JWT stays valid until it expires.
 *  + httpOnly cookies can't be read by JavaScript, so an XSS bug can't steal the token
 *    (tokens kept in localStorage can be).
 *  - One small DB lookup per request - fine at our scale (and cacheable later).
 */

export const SESSION_COOKIE = 'cl_session';

/** What routes see as `req.user`. */
export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: CurrentUser['role'];
  status: CurrentUser['status'];
  campIds: string[];
}

const sessionUserSelect = {
  id: true,
  email: true,
  fullName: true,
  role: true,
  status: true,
  coordinatedCamps: { select: { campId: true } },
} satisfies Prisma.UserSelect;

/** We store only SHA-256(token): a leaked database doesn't hand out working sessions. */
const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

function cookieOptions(): CookieOptions {
  return {
    httpOnly: true, // invisible to JavaScript -> safe from XSS token theft
    secure: config.isProduction, // HTTPS only in production
    sameSite: 'lax', // not sent on cross-site POSTs -> first line of CSRF defence
    path: '/',
    maxAge: config.sessionTtlMs,
  };
}

export async function startSession(req: Request, res: Response, userId: string) {
  // Session fixation defence: always issue a brand-new token at login and drop any old one.
  // (No need to clear the cookie: we overwrite it below.)
  if (req.sessionId) await prisma.session.deleteMany({ where: { id: req.sessionId } });

  const token = randomBytes(32).toString('base64url'); // 256 bits of randomness
  await prisma.session.create({
    data: {
      id: hashToken(token),
      userId,
      expiresAt: new Date(Date.now() + config.sessionTtlMs),
      userAgent: req.get('user-agent')?.slice(0, 300),
      ip: req.ip,
    },
  });
  res.cookie(SESSION_COOKIE, token, cookieOptions());
}

export async function endSession(req: Request, res: Response) {
  if (req.sessionId) {
    await prisma.session.deleteMany({ where: { id: req.sessionId } });
    req.sessionId = undefined;
    req.user = undefined;
  }
  res.clearCookie(SESSION_COOKIE, { ...cookieOptions(), maxAge: undefined });
}

/**
 * Look up a session token. Shared by HTTP requests (loadSession below) and the
 * real-time socket handshake (src/realtime.ts), so both apply exactly the same rules.
 * Returns null for unknown, expired or suspended sessions (and deletes those rows).
 */
export async function findSession(token: unknown) {
  if (typeof token !== 'string' || token.length > 100) return null;
  const id = hashToken(token);
  const session = await prisma.session.findUnique({
    where: { id },
    include: { user: { select: sessionUserSelect } },
  });
  if (!session) return null;
  if (session.expiresAt.getTime() <= Date.now() || session.user.status === 'SUSPENDED') {
    await prisma.session.delete({ where: { id } }).catch(() => {});
    return null;
  }
  const { coordinatedCamps, ...user } = session.user;
  const authUser: AuthUser = { ...user, campIds: coordinatedCamps.map((c) => c.campId) };
  return { id, expiresAt: session.expiresAt, user: authUser };
}

/** Fresh AuthUser from the database (used when a user's role or camps change). */
export async function loadAuthUser(userId: string): Promise<AuthUser | null> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: sessionUserSelect });
  if (!user) return null;
  const { coordinatedCamps, ...rest } = user;
  return { ...rest, campIds: coordinatedCamps.map((c) => c.campId) };
}

/** Runs on every request: if a valid session cookie is present, sets req.user. */
export const loadSession: RequestHandler = async (req, res, next) => {
  const token: unknown = req.cookies?.[SESSION_COOKIE];
  if (token === undefined) return next();

  const session = await findSession(token);
  if (!session) {
    res.clearCookie(SESSION_COOKIE, { ...cookieOptions(), maxAge: undefined });
    return next();
  }
  req.user = session.user;
  req.sessionId = session.id;

  // Sliding expiry: active users stay logged in; idle sessions expire.
  // Only write when half the lifetime is used up, to avoid a DB write on every request.
  const now = Date.now();
  if (session.expiresAt.getTime() - now < config.sessionTtlMs / 2) {
    await prisma.session.update({
      where: { id: session.id },
      data: { expiresAt: new Date(now + config.sessionTtlMs), lastSeenAt: new Date(now) },
    });
    res.cookie(SESSION_COOKIE, token as string, cookieOptions());
  }
  next();
};

/**
 * Delete every session of a user, optionally keeping the current one.
 * Returns the deleted session ids so live socket connections using them can be closed too.
 */
export async function revokeSessions(userId: string, exceptSessionId?: string) {
  const where = { userId, ...(exceptSessionId && { id: { not: exceptSessionId } }) };
  const sessions = await prisma.session.findMany({ where, select: { id: true } });
  const ids = sessions.map((s) => s.id);
  await prisma.session.deleteMany({ where: { id: { in: ids } } });
  return ids;
}
