import { Router } from 'express';
import {
  createDonationSchema,
  idParamSchema,
  listDonationsQuerySchema,
  updateDonationSchema,
} from '@crisislink/shared';
import { prisma } from '../db';
import type { Prisma } from '../generated/prisma/client';
import { conflict, notFound, parse } from '../lib/http';

export const donationsRouter = Router();

const donationInclude = {
  camp: { select: { id: true, name: true } },
  need: { select: { id: true, item: true, quantityNeeded: true, quantityFulfilled: true } },
} satisfies Prisma.DonationInclude;

donationsRouter.get('/donations', async (req, res) => {
  const { limit, offset, status, campId } = parse(listDonationsQuerySchema, req.query);
  const where: Prisma.DonationWhereInput = {
    ...(status && { status }),
    ...(campId && { campId }),
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

/** A donor pledges items, optionally for a specific camp need. */
donationsRouter.post('/donations', async (req, res) => {
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

  res.json(donation);
});
