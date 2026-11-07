import { Router } from 'express';
import {
  createDonationSchema,
  idParamSchema,
  listDonationsQuerySchema,
  updateDonationSchema,
} from '@crisislink/shared';
import { prisma } from '../db';
import type { Prisma } from '../generated/prisma/client';
import { assertCampAccess, isActive, requireStaff } from '../auth/policies';
import { conflict, forbidden, notFound, parse } from '../lib/http';
import { idempotent } from '../lib/idempotency';
import { publicSubmitLimiter } from '../lib/security';
import { publish } from '../realtime';

export const donationsRouter = Router();

const donationInclude = {
  camp: { select: { id: true, name: true } },
  need: { select: { id: true, item: true, quantityNeeded: true, quantityFulfilled: true } },
} satisfies Prisma.DonationInclude;

/** Donor names and phone numbers are personal data: staff only, and coordinators see only their camps. */
donationsRouter.get('/donations', requireStaff, async (req, res) => {
  const { limit, offset, status, campId } = parse(listDonationsQuerySchema, req.query);
  const user = req.user!;
  if (campId) assertCampAccess(user, campId);
  const where: Prisma.DonationWhereInput = {
    ...(status && { status }),
    ...(campId ? { campId } : user.role !== 'ADMIN' && { campId: { in: user.campIds } }),
  };
  const [items, total] = await prisma.$transaction([
    prisma.donation.findMany({
      where,
      include: donationInclude,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.donation.count({ where }),
  ]);
  res.json({ items, total, limit, offset });
});

/** Anyone (no login) can pledge items, optionally for a specific camp need. Rate-limited. */
donationsRouter.post('/donations', idempotent, publicSubmitLimiter, async (req, res) => {
  const { needId, campId, ...data } = parse(createDonationSchema, req.body);

  let resolvedCampId = campId;
  if (needId) {
    const need = await prisma.campNeed.findUnique({ where: { id: needId } });
    if (!need) throw notFound('Need');
    if (need.status !== 'OPEN') throw conflict('NEED_NOT_OPEN', 'This need is no longer open');
    resolvedCampId = need.campId;
  }

  const donation = await prisma.donation.create({
    data: { ...data, needId, campId: resolvedCampId },
    include: donationInclude,
  });
  publish(req, { type: 'donations.changed', campId: donation.campId });
  res.status(201).json(donation);
});

/**
 * Mark a pledge as RECEIVED (or CANCELLED).
 *
 * Receiving must update two tables together: the donation AND the need's
 * fulfilled quantity. A TRANSACTION makes that all-or-nothing.
 * `updateMany ... where status = PLEDGED` is a conditional update: if two people
 * click "Received" at once, only one matches, so stock is never counted twice.
 */
donationsRouter.patch('/donations/:id', async (req, res) => {
  const { id } = parse(idParamSchema, req.params);
  const { status } = parse(updateDonationSchema, req.body);

  const target = await prisma.donation.findUnique({ where: { id }, select: { campId: true } });
  if (!target) throw notFound('Donation');
  // General donations (no camp) are handled by admins; camp donations by that camp's staff.
  if (target.campId) assertCampAccess(req.user, target.campId);
  else if (!(isActive(req.user) && req.user.role === 'ADMIN')) throw forbidden();

  const donation = await prisma.$transaction(async (tx) => {
    const { count } = await tx.donation.updateMany({
      where: { id, status: 'PLEDGED' },
      data: { status, ...(status === 'RECEIVED' && { receivedAt: new Date() }) },
    });
    if (count === 0) {
      const exists = await tx.donation.findUnique({ where: { id }, select: { status: true } });
      if (!exists) throw notFound('Donation');
      throw conflict('ALREADY_PROCESSED', `Donation is already ${exists.status}`);
    }

    const updated = await tx.donation.findUniqueOrThrow({ where: { id } });
    if (status === 'RECEIVED' && updated.needId) {
      const need = await tx.campNeed.update({
        where: { id: updated.needId },
        data: { quantityFulfilled: { increment: updated.quantity } },
      });
      if (need.status === 'OPEN' && need.quantityFulfilled >= need.quantityNeeded) {
        await tx.campNeed.update({ where: { id: need.id }, data: { status: 'FULFILLED' } });
      }
    }
    return tx.donation.findUniqueOrThrow({ where: { id }, include: donationInclude });
  });

  publish(req, { type: 'donations.changed', campId: target.campId });
  // Receiving a donation can move a need's progress bar (or fulfil it).
  if (donation.campId && donation.need) {
    publish(req, { type: 'needs.changed', campId: donation.campId });
  }
  res.json(donation);
});
