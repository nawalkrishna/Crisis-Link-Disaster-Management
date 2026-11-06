import { Router } from 'express';
import {
  createCampSchema,
  idParamSchema,
  listCampsQuerySchema,
  updateCampSchema,
  type CampSummary,
  type Paginated,
} from '@crisislink/shared';
import { prisma } from '../db';
import type { Prisma } from '../generated/prisma/client';
import { assertCampAccess, requireAdmin } from '../auth/policies';
import { notFound, parse } from '../lib/http';
import { publish } from '../realtime';

export const campsRouter = Router();

/**
 * What we load for every camp. `_count` with a `where` lets the database count
 * current evacuees and open needs in the same query - no N+1 queries.
 */
export const campInclude = {
  district: { select: { slug: true, name: true } },
  _count: {
    select: {
      evacuees: { where: { checkedOutAt: null } },
      needs: { where: { status: 'OPEN' } },
    },
  },
} satisfies Prisma.ReliefCampInclude;

type CampWithCounts = Prisma.ReliefCampGetPayload<{ include: typeof campInclude }>;

/** Convert a DB row into the public API shape (decouples the API from the table layout). */
export function toCampSummary(camp: CampWithCounts): CampSummary {
  return {
    id: camp.id,
    name: camp.name,
    address: camp.address,
    district: camp.district,
    capacity: camp.capacity,
    occupancy: camp._count.evacuees,
    status: camp.status,
    contactName: camp.contactName,
    contactPhone: camp.contactPhone,
    latitude: camp.latitude,
    longitude: camp.longitude,
    openNeeds: camp._count.needs,
    createdAt: camp.createdAt.toISOString(),
    updatedAt: camp.updatedAt.toISOString(),
  };
}

// GET /api/camps?district=wayanad&status=OPEN&q=school&limit=20&offset=0
campsRouter.get('/camps', async (req, res) => {
  const { limit, offset, district, status, q } = parse(listCampsQuerySchema, req.query);

  const where: Prisma.ReliefCampWhereInput = {
    ...(district && { district: { slug: district } }),
    ...(status && { status }),
    ...(q && { name: { contains: q, mode: 'insensitive' } }),
  };

  // Run the page query and the total count in one round trip.
  const [camps, total] = await prisma.$transaction([
    prisma.reliefCamp.findMany({
      where,
      include: campInclude,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.reliefCamp.count({ where }),
  ]);

  const body: Paginated<CampSummary> = { items: camps.map(toCampSummary), total, limit, offset };
  res.json(body);
});

// Only admins open new camps.
campsRouter.post('/camps', requireAdmin, async (req, res) => {
  const { district, ...data } = parse(createCampSchema, req.body);
  const camp = await prisma.reliefCamp.create({
    // `connect` links to the existing district row by its unique slug.
    data: { ...data, district: { connect: { slug: district } } },
    include: campInclude,
  });
  publish(req, { type: 'camp.changed', campId: camp.id });
  res.status(201).json(toCampSummary(camp));
});

campsRouter.get('/camps/:id', async (req, res) => {
  const { id } = parse(idParamSchema, req.params);
  const camp = await prisma.reliefCamp.findUnique({ where: { id }, include: campInclude });
  if (!camp) throw notFound('Camp');
  res.json(toCampSummary(camp));
});

campsRouter.patch('/camps/:id', async (req, res) => {
  const { id } = parse(idParamSchema, req.params);
  assertCampAccess(req.user, id);
  const { district, ...data } = parse(updateCampSchema, req.body);
  const camp = await prisma.reliefCamp.update({
    where: { id },
    data: { ...data, ...(district && { district: { connect: { slug: district } } }) },
    include: campInclude,
  });
  publish(req, { type: 'camp.changed', campId: id });
  res.json(toCampSummary(camp));
});
