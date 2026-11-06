import { Router } from 'express';
import {
  mapQuerySchema,
  nearbyCampsQuerySchema,
  type MapResponse,
  type NearbyCamp,
} from '@crisislink/shared';
import { prisma } from '../db';
import { parse } from '../lib/http';
import { campInclude, toCampSummary } from './camps';

export const geoRouter = Router();

/**
 * "Where is the nearest camp with space?" - asked by someone standing in floodwater with a phone.
 *
 * HOW (without PostGIS):
 *  1. BOUNDING BOX first: keep only camps whose lat/lng fall inside a square around the person.
 *     That's a cheap range comparison the (latitude, longitude) index can answer, so the
 *     database never computes distances for camps 300 km away.
 *  2. HAVERSINE for the survivors: the real great-circle distance (see shared/geo.ts), then
 *     drop the square's corners that are outside the circle, sort, and take the closest few.
 *
 * PostGIS would do the same with a `geography` column and a GiST index (`ST_DWithin`,
 * `<->` nearest-neighbour ordering) - worth it for millions of points or polygons like
 * flood zones. For a few thousand camps, plain SQL is fast and needs no extension.
 */
geoRouter.get('/camps/nearby', async (req, res) => {
  const { lat, lng, radiusKm, limit, hasSpace } = parse(nearbyCampsQuerySchema, req.query);

  // One degree of latitude is ~111 km everywhere; a degree of longitude shrinks with cos(latitude).
  const dLat = radiusKm / 111.32;
  const dLng = radiusKm / (111.32 * Math.max(0.01, Math.cos((lat * Math.PI) / 180)));

  const rows = await prisma.$queryRaw<{ id: string; distanceKm: number }[]>`
    SELECT id, "distanceKm" FROM (
      SELECT c.id,
        2 * 6371 * asin(sqrt(
          power(sin(radians(c.latitude - ${lat}::float8) / 2), 2) +
          cos(radians(${lat}::float8)) * cos(radians(c.latitude)) *
          power(sin(radians(c.longitude - ${lng}::float8) / 2), 2)
        )) AS "distanceKm"
      FROM relief_camps c
      WHERE c.latitude  BETWEEN ${lat - dLat}::float8 AND ${lat + dLat}::float8
        AND c.longitude BETWEEN ${lng - dLng}::float8 AND ${lng + dLng}::float8
        AND (${hasSpace}::boolean = false OR (
          c.status = 'OPEN' AND
          (SELECT count(*) FROM evacuees e WHERE e.camp_id = c.id AND e.checked_out_at IS NULL) < c.capacity
        ))
        AND c.status <> 'CLOSED'
    ) nearby
    WHERE "distanceKm" <= ${radiusKm}::float8
    ORDER BY "distanceKm"
    LIMIT ${limit}`;

  // Load full camp summaries for the winners (one query), then restore distance order.
  const camps = await prisma.reliefCamp.findMany({
    where: { id: { in: rows.map((r) => r.id) } },
    include: campInclude,
  });
  const byId = new Map(camps.map((c) => [c.id, c]));
  const items: NearbyCamp[] = rows.flatMap((r) => {
    const camp = byId.get(r.id);
    return camp ? [{ ...toCampSummary(camp), distanceKm: Math.round(r.distanceKm * 10) / 10 }] : [];
  });
  res.json({ items });
});

/**
 * Everything the map draws, in one small response: camps that are not closed and incidents
 * that are still active, only those with coordinates, only the fields a marker needs.
 */
geoRouter.get('/map', async (req, res) => {
  const { district } = parse(mapQuerySchema, req.query);
  const inDistrict = district ? { district: { slug: district } } : {};

  const [camps, incidents] = await prisma.$transaction([
    prisma.reliefCamp.findMany({
      where: {
        ...inDistrict,
        status: { not: 'CLOSED' },
        latitude: { not: null },
        longitude: { not: null },
      },
      include: campInclude,
      take: 2000,
    }),
    prisma.incidentReport.findMany({
      where: {
        ...inDistrict,
        status: { in: ['REPORTED', 'VERIFIED'] },
        latitude: { not: null },
        longitude: { not: null },
      },
      select: {
        id: true,
        type: true,
        severity: true,
        locationText: true,
        latitude: true,
        longitude: true,
        createdAt: true,
        district: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 2000,
    }),
  ]);

  const body: MapResponse = {
    camps: camps.map((c) => ({
      id: c.id,
      name: c.name,
      district: c.district.name,
      status: c.status,
      capacity: c.capacity,
      occupancy: c._count.evacuees,
      openNeeds: c._count.needs,
      latitude: c.latitude!,
      longitude: c.longitude!,
    })),
    incidents: incidents.map((i) => ({
      id: i.id,
      type: i.type,
      severity: i.severity,
      locationText: i.locationText,
      district: i.district.name,
      latitude: i.latitude!,
      longitude: i.longitude!,
      createdAt: i.createdAt.toISOString(),
    })),
  };
  res.json(body);
});
