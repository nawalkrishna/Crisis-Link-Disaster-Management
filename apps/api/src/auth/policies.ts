import type { RequestHandler } from 'express';
import type { Role } from '@crisislink/shared';
import { forbidden, unauthorized } from '../lib/http';
import type { AuthUser } from './session';

/**
 * AUTHORISATION lives here, in one file, so "who may do what" can be read and reviewed
 * in one place instead of being scattered across routes.
 *
 *  - Authentication = proving who you are (login).
 *  - Authorisation  = deciding what you may do (this file).
 *
 * Two layers:
 *  1. Role-based (RBAC):   "only ADMINs create camps"            -> requireRole()
 *  2. Resource-based:      "a COORDINATOR manages only THEIR camps" -> canManageCamp()
 */

export const isActive = (user?: AuthUser): user is AuthUser => user?.status === 'ACTIVE';

export const isStaff = (user?: AuthUser): user is AuthUser =>
  isActive(user) && (user.role === 'ADMIN' || user.role === 'COORDINATOR');

export const canManageCamp = (user: AuthUser | undefined, campId: string) =>
  isActive(user) &&
  (user.role === 'ADMIN' || (user.role === 'COORDINATOR' && user.campIds.includes(campId)));

/** Throws 401 if not logged in, 403 if logged in but not allowed to manage this camp. */
export function assertCampAccess(
  user: AuthUser | undefined,
  campId: string,
): asserts user is AuthUser {
  if (!user) throw unauthorized();
  if (!canManageCamp(user, campId)) throw forbidden('You do not manage this camp');
}

// ---------- Middleware ----------

export const requireAuth: RequestHandler = (req, _res, next) => {
  if (!req.user) throw unauthorized();
  next();
};

/** Logged in, account ACTIVE, and one of the given roles. */
export const requireRole =
  (...roles: Role[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.user) throw unauthorized();
    if (req.user.status !== 'ACTIVE') throw forbidden('Your account is not active yet');
    if (!roles.includes(req.user.role)) throw forbidden();
    next();
  };

export const requireStaff = requireRole('ADMIN', 'COORDINATOR');
export const requireAdmin = requireRole('ADMIN');
