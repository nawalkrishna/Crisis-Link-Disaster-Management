import { z } from 'zod';
import type { CampStatus, IncidentType, Priority } from './enums';
import type { CampSummary } from './api';
import { districtSlugSchema } from './schemas';

/**
 * GEOGRAPHY
 *
 * Kerala's rough bounding box. Used to centre maps and to reject coordinates that are
 * obviously wrong (someone swapping latitude and longitude puts a camp in the ocean).
 */
export const KERALA_BOUNDS = {
  south: 8.17,
  west: 74.85,
  north: 12.8,
  east: 77.42,
} as const;
export const KERALA_CENTER = { latitude: 10.45, longitude: 76.27 } as const;

const EARTH_RADIUS_KM = 6371;
const toRad = (deg: number) => (deg * Math.PI) / 180;

/**
 * Great-circle distance between two points ("as the crow flies") with the haversine formula.
 * The earth isn't flat, so plain Pythagoras on lat/lng is wrong - one degree of longitude is
 * 111 km at the equator but only ~109 km in Kerala and 0 km at the poles.
 * The API runs the same formula in SQL; this copy lets the browser show distances too.
 */
export function distanceKm(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
) {
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

// ---------- Requests ----------

/** GET /api/camps/nearby?lat=11.5&lng=76.1 - "where is the closest camp with space?" */
export const nearbyCampsQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radiusKm: z.coerce.number().positive().max(300).default(50),
  limit: z.coerce.number().int().min(1).max(20).default(5),
  /** Only camps that are OPEN and still have free places (default). */
  hasSpace: z.stringbool().default(true),
});
export type NearbyCampsQuery = z.input<typeof nearbyCampsQuerySchema>;

/** GET /api/map?district=wayanad */
export const mapQuerySchema = z.object({ district: districtSlugSchema.optional() });

// ---------- Responses ----------

export interface NearbyCamp extends CampSummary {
  distanceKm: number;
}

/** Just enough to draw a marker and a popup - the map can show hundreds of these. */
export interface MapCamp {
  id: string;
  name: string;
  district: string;
  status: CampStatus;
  capacity: number;
  occupancy: number;
  openNeeds: number;
  latitude: number;
  longitude: number;
}

export interface MapIncident {
  id: string;
  type: IncidentType;
  severity: Priority;
  locationText: string;
  district: string;
  latitude: number;
  longitude: number;
  createdAt: string;
}

export interface MapResponse {
  camps: MapCamp[];
  incidents: MapIncident[];
}
