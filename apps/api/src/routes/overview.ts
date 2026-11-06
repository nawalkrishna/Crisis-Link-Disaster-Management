import { Router } from 'express';
import {
  PRIORITIES,
  slugParamSchema,
  type DistrictSummary,
  type Priority,
  type StatsResponse,
} from '@crisislink/shared';
import { prisma } from '../db';
import { notFound, parse } from '../lib/http';

export const overviewRouter = Router();

/**
 * Per-district numbers in ONE SQL query using correlated sub-queries.
 * Sometimes plain SQL is the clearest tool; Prisma's tagged template
 * ($queryRaw`...`) still sends values as parameters, so it is safe from SQL injection.
 */
async function districtSummaries(slug?: string): Promise<DistrictSummary[]> {
  return prisma.$queryRaw<DistrictSummary[]>`
    SELECT
      d.slug,
      d.name,
      (SELECT count(*) FROM relief_camps c
         WHERE c.district_id = d.id AND c.status <> 'CLOSED')::int AS "openCamps",
      (SELECT count(*) FROM evacuees e JOIN relief_camps c ON c.id = e.camp_id
         WHERE c.district_id = d.id AND e.checked_out_at IS NULL)::int AS "currentEvacuees",
      (SELECT count(*) FROM incident_reports i
         WHERE i.district_id = d.id AND i.status IN ('REPORTED', 'VERIFIED'))::int AS "activeIncidents"
    FROM districts d
    WHERE ${slug ?? null}::text IS NULL OR d.slug = ${slug ?? null}
    ORDER BY d.id`;
}

overviewRouter.get('/districts', async (_req, res) => {
  res.json({ items: await districtSummaries() });
});

overviewRouter.get('/districts/:slug', async (req, res) => {
  const { slug } = parse(slugParamSchema, req.params);
  const [summary] = await districtSummaries(slug);
  if (!summary) throw notFound('District');
  res.json(summary);
});

/** Headline numbers for the dashboard - all real, no more hard-coded "1250 people safe". */
overviewRouter.get('/stats', async (_req, res) => {
  const [camps, currentEvacuees, openNeeds, criticalNeeds, incidentGroups, donationsReceived] =
    await prisma.$transaction([
      prisma.reliefCamp.aggregate({
        where: { status: { not: 'CLOSED' } },
        _count: true,
        _sum: { capacity: true },
      }),
      prisma.evacuee.count({ where: { checkedOutAt: null } }),
      prisma.campNeed.count({ where: { status: 'OPEN' } }),
      prisma.campNeed.count({ where: { status: 'OPEN', priority: 'CRITICAL' } }),
      prisma.incidentReport.groupBy({
        by: ['severity'],
        where: { status: { in: ['REPORTED', 'VERIFIED'] } },
        _count: { _all: true },
        orderBy: { severity: 'asc' },
      }),
      prisma.donation.count({ where: { status: 'RECEIVED' } }),
    ]);

  const incidentsBySeverity = Object.fromEntries(PRIORITIES.map((p) => [p, 0])) as Record<
    Priority,
    number
  >;
  for (const group of incidentGroups) {
    incidentsBySeverity[group.severity] = group._count._all;
  }

  const body: StatsResponse = {
    openCamps: camps._count,
    totalCapacity: camps._sum.capacity ?? 0,
    currentEvacuees,
    openNeeds,
    criticalNeeds,
    activeIncidents: Object.values(incidentsBySeverity).reduce((a, b) => a + b, 0),
    incidentsBySeverity,
    donationsReceived,
  };
  res.json(body);
});
