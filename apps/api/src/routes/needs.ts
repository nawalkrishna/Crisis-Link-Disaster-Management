import { Router } from 'express';
import {
  createNeedSchema,
  idParamSchema,
  listNeedsQuerySchema,
  updateNeedSchema,
} from '@crisislink/shared';
import { prisma } from '../db';
import type { Prisma } from '../generated/prisma/client';
import { assertCampAccess } from '../auth/policies';
import { conflict, notFound, parse } from '../lib/http';

export const needsRouter = Router();

const needInclude = {
  camp: { select: { id: true, name: true, district: { select: { slug: true, name: true } } } },
} satisfies Prisma.CampNeedInclude;

// Donors browse this list: "what is needed, where, how urgently?"
needsRouter.get('/needs', async (req, res) => {
  const { limit, offset, district, status, priority, category } = parse(
    listNeedsQuerySchema,
    req.query,
  );
  const where: Prisma.CampNeedWhereInput = {
    status,
    ...(priority && { priority }),
    ...(category && { category }),
    ...(district && { camp: { district: { slug: district } } }),
  };
  const [items, total] = await prisma.$transaction([
    prisma.campNeed.findMany({
      where,
      include: needInclude,
      // Enums sort in declaration order, so 'desc' puts CRITICAL first.
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      take: limit,
      skip: offset,
    }),
    prisma.campNeed.count({ where }),
  ]);
  res.json({ items, total, limit, offset });
});

needsRouter.get('/camps/:id/needs', async (req, res) => {
  const { id: campId } = parse(idParamSchema, req.params);
  const items = await prisma.campNeed.findMany({
    where: { campId },
    orderBy: [{ status: 'asc' }, { priority: 'desc' }],
  });
  res.json({ items, total: items.length });
});

needsRouter.post('/camps/:id/needs', async (req, res) => {
  const { id: campId } = parse(idParamSchema, req.params);
  assertCampAccess(req.user, campId);
  const data = parse(createNeedSchema, req.body);
  const camp = await prisma.reliefCamp.findUnique({
    where: { id: campId },
    select: { status: true },
  });
  if (!camp) throw notFound('Camp');
  if (camp.status === 'CLOSED') throw conflict('CAMP_CLOSED', 'Cannot add needs to a closed camp');
  const need = await prisma.campNeed.create({ data: { ...data, campId }, include: needInclude });
  res.status(201).json(need);
});

needsRouter.patch('/needs/:id', async (req, res) => {
  const { id } = parse(idParamSchema, req.params);
  const data = parse(updateNeedSchema, req.body);
  const existing = await prisma.campNeed.findUnique({ where: { id }, select: { campId: true } });
  if (!existing) throw notFound('Need');
  assertCampAccess(req.user, existing.campId);
  const need = await prisma.campNeed.update({ where: { id }, data, include: needInclude });
  res.json(need);
});
