import { Router } from 'express';
import {
  changePasswordSchema,
  loginSchema,
  registerSchema,
  updateProfileSchema,
  type CurrentUser,
} from '@crisislink/shared';
import { prisma } from '../db';
import type { Prisma } from '../generated/prisma/client';
import { burnPasswordCheckTime, hashPassword, verifyPassword } from '../auth/password';
import { requireAuth } from '../auth/policies';
import { endSession, revokeSessions, startSession } from '../auth/session';
import { HttpError, conflict, notFound, parse } from '../lib/http';
import { loginLimiter, registerLimiter } from '../lib/security';

export const authRouter = Router();

const currentUserSelect = {
  id: true,
  email: true,
  fullName: true,
  phone: true,
  role: true,
  status: true,
  coordinatedCamps: { select: { campId: true } },
  volunteerProfile: {
    select: {
      hometown: true,
      skills: true,
      available: true,
      district: { select: { slug: true, name: true } },
    },
  },
} satisfies Prisma.UserSelect;

/** Load the public view of a user. Note what is NOT selected: passwordHash. */
export async function loadCurrentUser(userId: string): Promise<CurrentUser> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: currentUserSelect });
  if (!user) throw notFound('User');
  const { coordinatedCamps, volunteerProfile, ...rest } = user;
  return {
    ...rest,
    campIds: coordinatedCamps.map((c) => c.campId),
    volunteer: volunteerProfile,
  };
}

/** Volunteer sign-up. The account starts PENDING until a coordinator/admin approves it. */
authRouter.post('/auth/register', registerLimiter, async (req, res) => {
  const { password, district, hometown, skills, ...data } = parse(registerSchema, req.body);

  if (await prisma.user.findUnique({ where: { email: data.email }, select: { id: true } })) {
    throw conflict('EMAIL_TAKEN', 'An account with this email already exists');
  }

  const user = await prisma.user.create({
    data: {
      ...data,
      passwordHash: await hashPassword(password),
      role: 'VOLUNTEER',
      status: 'PENDING',
      volunteerProfile: {
        create: { hometown, skills, district: { connect: { slug: district } } },
      },
    },
    select: { id: true },
  });

  await startSession(req, res, user.id);
  res.status(201).json(await loadCurrentUser(user.id));
});

authRouter.post('/auth/login', loginLimiter, async (req, res) => {
  const { email, password } = parse(loginSchema, req.body);
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, passwordHash: true, status: true },
  });

  // Same message for "no such email" and "wrong password": don't reveal which emails exist.
  const invalid = new HttpError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  if (!user) {
    await burnPasswordCheckTime(password);
    throw invalid;
  }
  if (!(await verifyPassword(user.passwordHash, password))) throw invalid;
  if (user.status === 'SUSPENDED') {
    throw new HttpError(403, 'ACCOUNT_SUSPENDED', 'This account has been suspended');
  }

  await startSession(req, res, user.id);
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  res.json(await loadCurrentUser(user.id));
});

authRouter.post('/auth/logout', async (req, res) => {
  await endSession(req, res);
  res.status(204).end();
});

authRouter.get('/auth/me', requireAuth, async (req, res) => {
  res.json(await loadCurrentUser(req.user!.id));
});

authRouter.patch('/auth/me', requireAuth, async (req, res) => {
  const { fullName, phone, district, hometown, skills, available } = parse(
    updateProfileSchema,
    req.body,
  );
  const userId = req.user!.id;
  const profileChanges = { hometown, skills, available };
  const touchesProfile = district || Object.values(profileChanges).some((v) => v !== undefined);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { fullName, phone } });
    if (touchesProfile) {
      const profile = await tx.volunteerProfile.findUnique({ where: { userId } });
      if (!profile)
        throw new HttpError(400, 'NOT_A_VOLUNTEER', 'Only volunteers have these fields');
      await tx.volunteerProfile.update({
        where: { userId },
        data: { ...profileChanges, ...(district && { district: { connect: { slug: district } } }) },
      });
    }
  });
  res.json(await loadCurrentUser(userId));
});

/** Changing the password logs out every OTHER device (in case the old password leaked). */
authRouter.post('/auth/change-password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = parse(changePasswordSchema, req.body);
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: req.user!.id },
    select: { passwordHash: true },
  });
  if (!(await verifyPassword(user.passwordHash, currentPassword))) {
    throw new HttpError(400, 'WRONG_PASSWORD', 'Current password is incorrect');
  }
  await prisma.user.update({
    where: { id: req.user!.id },
    data: { passwordHash: await hashPassword(newPassword) },
  });
  const { count } = await revokeSessions(req.user!.id, req.sessionId);
  res.json({ ok: true, otherSessionsRevoked: count });
});
