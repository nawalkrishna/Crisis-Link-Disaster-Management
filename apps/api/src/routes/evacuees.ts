import { Router } from 'express';
import {
  createEvacueeSchema,
  idParamSchema,
  listEvacueesQuerySchema,
  updateEvacueeSchema,
} from '@crisislink/shared';
import { prisma } from '../db';
import type { Prisma } from '../generated/prisma/client';
import { assertCampAccess } from '../auth/policies';
import { conflict, notFound, parse } from '../lib/http';
import { idempotent } from '../lib/idempotency';
import { publish } from '../realtime';

/**
 * Evacuee records are PERSONAL DATA (names, ages, medical notes) about people in a crisis.
 * Only the camp's own coordinators and admins can see or change them - never the public.
 */
export const evacueesRouter = Router();

evacueesRouter.get('/camps/:id/evacuees', async (req, res) => {
  const { id: campId } = parse(idParamSchema, req.params);
  assertCampAccess(req.user, campId);
  const { limit, offset, includeCheckedOut, q } = parse(listEvacueesQuerySchema, req.query);

  const where: Prisma.EvacueeWhereInput = {
    campId,
    ...(!includeCheckedOut && { checkedOutAt: null }),
    ...(q && { fullName: { contains: q, mode: 'insensitive' } }),
  };
  const [items, total] = await prisma.$transaction([
    prisma.evacuee.findMany({ where, orderBy: { checkedInAt: 'desc' }, take: limit, skip: offset }),
    prisma.evacuee.count({ where }),
  ]);
  res.json({ items, total, limit, offset });
});

/**
 * Check a person into a camp.
 *
 * Business rule: a camp must not go over capacity. Two coordinators clicking "Add"
 * at the same moment could both see "1 place left" and both insert - a classic
 * RACE CONDITION. We prevent it by locking the camp row (`SELECT ... FOR UPDATE`)
 * inside a transaction: the second request waits until the first one commits,
 * then sees the up-to-date count.
 */
evacueesRouter.post('/camps/:id/evacuees', idempotent, async (req, res) => {
  const { id: campId } = parse(idParamSchema, req.params);
  assertCampAccess(req.user, campId);
  const data = parse(createEvacueeSchema, req.body);

  const evacuee = await prisma.$transaction(async (tx) => {
    const [camp] = await tx.$queryRaw<{ capacity: number; status: string }[]>`
      SELECT capacity, status::text AS status FROM relief_camps WHERE id = ${campId}::uuid FOR UPDATE`;
    if (!camp) throw notFound('Camp');
    if (camp.status === 'CLOSED') throw conflict('CAMP_CLOSED', 'This camp is closed');

    const occupancy = await tx.evacuee.count({ where: { campId, checkedOutAt: null } });
    if (occupancy >= camp.capacity) throw conflict('CAMP_FULL', 'This camp is at full capacity');

    const created = await tx.evacuee.create({ data: { ...data, campId } });
    if (occupancy + 1 >= camp.capacity) {
      await tx.reliefCamp.update({ where: { id: campId }, data: { status: 'FULL' } });
    }
    return created;
  });

  publish(req, { type: 'evacuees.changed', campId });
  res.status(201).json(evacuee);
});

evacueesRouter.patch('/evacuees/:id', async (req, res) => {
  const { id } = parse(idParamSchema, req.params);
  const { checkedOut, ...data } = parse(updateEvacueeSchema, req.body);

  const evacuee = await prisma.$transaction(async (tx) => {
    const existing = await tx.evacuee.findUnique({ where: { id } });
    if (!existing) throw notFound('Evacuee');
    assertCampAccess(req.user, existing.campId);

    const checkingOut = checkedOut === true && existing.checkedOutAt === null;
    const updated = await tx.evacuee.update({
      where: { id },
      data: {
        ...data,
        ...(checkingOut && { checkedOutAt: new Date() }),
        ...(checkedOut === false && { checkedOutAt: null }),
      },
    });

    // A place just freed up: a FULL camp can accept people again.
    if (checkingOut) {
      await tx.reliefCamp.updateMany({
        where: { id: existing.campId, status: 'FULL' },
        data: { status: 'OPEN' },
      });
    }
    return updated;
  });

  publish(req, { type: 'evacuees.changed', campId: evacuee.campId });
  res.json(evacuee);
});
