import { Router } from 'express';
import {
  createIncidentSchema,
  idParamSchema,
  listIncidentsQuerySchema,
  updateIncidentSchema,
} from '@crisislink/shared';
import { prisma } from '../db';
import type { Prisma } from '../generated/prisma/client';
import { notFound, parse } from '../lib/http';

export const incidentsRouter = Router();

const incidentInclude = {
  district: { select: { slug: true, name: true } },
} satisfies Prisma.IncidentReportInclude;

incidentsRouter.get('/incidents', async (req, res) => {
  const { limit, offset, district, status, severity } = parse(listIncidentsQuerySchema, req.query);
  const where: Prisma.IncidentReportWhereInput = {
    ...(district && { district: { slug: district } }),
    ...(status && { status }),
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
  res.json({ items, total, limit, offset });
});

incidentsRouter.get('/incidents/:id', async (req, res) => {
  const { id } = parse(idParamSchema, req.params);
  const incident = await prisma.incidentReport.findUnique({
    where: { id },
    include: incidentInclude,
  });
  if (!incident) throw notFound('Incident');
  res.json(incident);
});

/** Anyone can report an incident (Phase 2 adds rate limiting + verification by staff). */
incidentsRouter.post('/incidents', async (req, res) => {
  const { district, ...data } = parse(createIncidentSchema, req.body);
  const incident = await prisma.incidentReport.create({
    data: { ...data, district: { connect: { slug: district } } },
    include: incidentInclude,
  });
  res.status(201).json(incident);
});

incidentsRouter.patch('/incidents/:id', async (req, res) => {
  const { id } = parse(idParamSchema, req.params);
  const data = parse(updateIncidentSchema, req.body);
  const incident = await prisma.incidentReport.update({
    where: { id },
    data,
    include: incidentInclude,
  });
  res.json(incident);
});
