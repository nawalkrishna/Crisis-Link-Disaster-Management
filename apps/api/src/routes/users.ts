import { Router } from 'express';
import {
  idParamSchema,
  listUsersQuerySchema,
  listVolunteersQuerySchema,
  setUserCampsSchema,
  updateUserSchema,
} from '@crisislink/shared';
import { prisma } from '../db';
import type { Prisma } from '../generated/prisma/client';
import { requireAdmin, requireStaff } from '../auth/policies';
import { revokeSessions } from '../auth/session';
import { HttpError, notFound, parse } from '../lib/http';
import { loadCurrentUser } from './auth';

export const usersRouter = Router();

/** Never select passwordHash in list views - an explicit allow-list of fields. */
const userListSelect = {
  id: true,
  email: true,
  fullName: true,
  phone: true,
  role: true,
  status: true,
  lastLoginAt: true,
  createdAt: true,
  volunteerProfile: {
    select: { skills: true, available: true, district: { select: { slug: true, name: true } } },
  },
  coordinatedCamps: { select: { camp: { select: { id: true, name: true } } } },
} satisfies Prisma.UserSelect;

// ---------- Admin: manage accounts ----------

usersRouter.get('/users', requireAdmin, async (req, res) => {
  const { limit, offset, role, status, q } = parse(listUsersQuerySchema, req.query);
  const where: Prisma.UserWhereInput = {
    ...(role && { role }),
    ...(status && { status }),
    ...(q && {
      OR: [
        { fullName: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
      ],
    }),
  };
  const [items, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      select: userListSelect,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.user.count({ where }),
  ]);
  res.json({ items, total, limit, offset });
});

/** Approve (status ACTIVE), suspend, or change someone's role. */
usersRouter.patch('/users/:id', requireAdmin, async (req, res) => {
  const { id } = parse(idParamSchema, req.params);
  const { role, status } = parse(updateUserSchema, req.body);

  // Guard rail: an admin can't demote or suspend themselves and lock everyone out.
  if (id === req.user!.id && ((role && role !== 'ADMIN') || (status && status !== 'ACTIVE'))) {
    throw new HttpError(400, 'SELF_LOCKOUT', 'You cannot demote or suspend your own account');
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id }, data: { role, status } });
    // Camp assignments only make sense for coordinators.
    if (role && role !== 'COORDINATOR') {
      await tx.campCoordinator.deleteMany({ where: { userId: id } });
    }
  });
  // Suspension takes effect immediately: kill all of the user's sessions.
  if (status === 'SUSPENDED') await revokeSessions(id);

  res.json(await loadCurrentUser(id));
});

/** Replace the set of camps a coordinator manages. */
usersRouter.put('/users/:id/camps', requireAdmin, async (req, res) => {
  const { id } = parse(idParamSchema, req.params);
  const { campIds } = parse(setUserCampsSchema, req.body);

  const user = await prisma.user.findUnique({ where: { id }, select: { role: true } });
  if (!user) throw notFound('User');
  if (user.role !== 'COORDINATOR') {
    throw new HttpError(400, 'NOT_A_COORDINATOR', 'Only coordinators can be assigned to camps');
  }

  await prisma.$transaction([
    prisma.campCoordinator.deleteMany({ where: { userId: id } }),
    prisma.campCoordinator.createMany({
      data: [...new Set(campIds)].map((campId) => ({ userId: id, campId })),
    }),
  ]);
  res.json(await loadCurrentUser(id));
});

// ---------- Staff: find volunteers ----------

/** Coordinators look for available volunteers with the right skill in their district. */
usersRouter.get('/volunteers', requireStaff, async (req, res) => {
  const { limit, offset, district, skill, available, status } = parse(
    listVolunteersQuerySchema,
    req.query,
  );
  const where: Prisma.UserWhereInput = {
    role: 'VOLUNTEER',
    status,
    volunteerProfile: {
      ...(district && { district: { slug: district } }),
      ...(skill && { skills: { has: skill } }),
      ...(available !== undefined && { available }),
    },
  };
  const [items, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        status: true,
        createdAt: true,
        volunteerProfile: userListSelect.volunteerProfile,
        _count: {
          select: { assignedTasks: { where: { status: { in: ['ASSIGNED', 'IN_PROGRESS'] } } } },
        },
      },
      orderBy: { fullName: 'asc' },
      take: limit,
      skip: offset,
    }),
    prisma.user.count({ where }),
  ]);
  res.json({ items, total, limit, offset });
});

/** Staff approve pending volunteers (coordinators can do this too, not just admins). */
usersRouter.post('/volunteers/:id/approve', requireStaff, async (req, res) => {
  const { id } = parse(idParamSchema, req.params);
  const { count } = await prisma.user.updateMany({
    where: { id, role: 'VOLUNTEER', status: 'PENDING' },
    data: { status: 'ACTIVE' },
  });
  if (count === 0) {
    throw new HttpError(409, 'NOT_PENDING', 'No pending volunteer with this id');
  }
  res.json(await loadCurrentUser(id));
});
