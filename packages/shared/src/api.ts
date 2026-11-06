/**
 * Shapes of API responses. The API returns these, and the web app reads them,
 * so if one side changes a field the other side fails to compile.
 * Dates travel over JSON as ISO-8601 strings.
 */
import type { CampStatus, Priority } from './enums';

export interface HealthResponse {
  status: 'ok' | 'degraded';
  service: 'crisislink-api';
  version: string;
  uptimeSeconds: number;
  timestamp: string;
  database: 'up' | 'down';
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    /** Field-level validation problems, e.g. { "capacity": ["Too small"] }. */
    details?: Record<string, string[]>;
  };
}

/** List endpoints return a page of items plus the total count. */
export interface Paginated<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface DistrictSummary {
  slug: string;
  name: string;
  openCamps: number;
  currentEvacuees: number;
  activeIncidents: number;
}

export interface CampSummary {
  id: string;
  name: string;
  address: string;
  district: { slug: string; name: string };
  capacity: number;
  occupancy: number;
  status: CampStatus;
  contactName: string | null;
  contactPhone: string | null;
  latitude: number | null;
  longitude: number | null;
  openNeeds: number;
  createdAt: string;
  updatedAt: string;
}

export interface StatsResponse {
  openCamps: number;
  totalCapacity: number;
  currentEvacuees: number;
  openNeeds: number;
  criticalNeeds: number;
  activeIncidents: number;
  incidentsBySeverity: Record<Priority, number>;
  donationsReceived: number;
}
