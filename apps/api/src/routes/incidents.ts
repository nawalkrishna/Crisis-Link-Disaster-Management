import { Router } from 'express';
import {
  createIncidentSchema,
  idParamSchema,
  listIncidentsQuerySchema,
  updateIncidentSchema,
} from '@crisislink/shared';
import { prisma } from '../db';
import type { Prisma } from '../generated/prisma/client';
import { isStaff, requireStaff } from '../auth/policies';
import { notFound, parse } from '../lib/http';
import { publicSubmitLimiter } from '../lib/security';
import { publish } from '../realtime';

export const incidentsRouter = Router();

const incidentInclude = {
  district: { select: { slug: true, name: true } },
} satisfies Prisma.IncidentReportInclude;

type Incident = Prisma.IncidentReportGetPayload<{ include: typeof incidentInclude }>;

/**
 * Incidents are public (people need to know where it's dangerous), but the reporter's
 * name and phone are only for staff who may need to call back.
 */
function forViewer(incident: Incident, staff: boolean) {
  if (staff) return incident;
  const { reporterName: _name, reporterPhone: _phone, ...publicFields } = incident;
  return publicFields;
}

incidentsRouter.get('/incidents', async (req, res) => {
  const { limit, offset, district, status, severity, active } = parse(
    listIncidentsQuerySchema,
    req.query,
  );
  const where: Prisma.IncidentReportWhereInput = {
    ...(district && { district: { slug: district } }),
    ...(status ? { status } : active && { status: { in: ['REPORTED', 'VERIFIED'] } }),
    ...(severity && { severity }),
  };
  const [items, total] = await prisma.$transaction([
    prisma.incidentReport.findMany({
      where,
      include: incidentInclude,
      orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
      take: limit,
      skip: offset,
    }),
    prisma.incidentReport.count({ where }),
  ]);
  const staff = isStaff(req.user);
  res.json({ items: items.map((i) => forViewer(i, staff)), total, limit, offset });
});

incidentsRouter.get('/incidents/:id', async (req, res) => {
  const { id } = parse(idParamSchema, req.params);
  const incident = await prisma.incidentReport.findUnique({
    where: { id },
    include: incidentInclude,
  });
  if (!incident) throw notFound('Incident');
  res.json(forViewer(incident, isStaff(req.user)));
});

/** Anyone can report an incident - no login in an emergency. Rate-limited against spam. */
incidentsRouter.post('/incidents', publicSubmitLimiter, async (req, res) => {
  const { district, ...data } = parse(createIncidentSchema, req.body);
  const incident = await prisma.incidentReport.create({
    data: { ...data, district: { connect: { slug: district } } },
    include: incidentInclude,
  });
  publish(req, {
    type: 'incident.changed',
    incidentId: incident.id,
    created: {
      severity: incident.severity,
      district: incident.district.name,
      locationText: incident.locationText,
    },
  });
  res.status(201).json(forViewer(incident, isStaff(req.user)));
});

/** Staff verify, resolve or dismiss reports. */
incidentsRouter.patch('/incidents/:id', requireStaff, async (req, res) => {
  const { id } = parse(idParamSchema, req.params);
  const data = parse(updateIncidentSchema, req.body);
  const incident = await prisma.incidentReport.update({
    where: { id },
    data,
    include: incidentInclude,
  });
  publish(req, { type: 'incident.changed', incidentId: id });
  res.json(incident);
});
