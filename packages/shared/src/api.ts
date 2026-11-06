/**
 * Shapes of API responses. The API returns these, and the web app reads them,
 * so if one side changes a field the other side fails to compile.
 * Dates travel over JSON as ISO-8601 strings.
 */
import type {
  AccountStatus,
  CampStatus,
  DonationStatus,
  Gender,
  IncidentStatus,
  IncidentType,
  NeedStatus,
  Priority,
  Role,
  SupplyCategory,
  TaskStatus,
  VolunteerSkill,
} from './enums';

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

// ---------- Accounts (Phase 2) ----------

/** The logged-in user as returned by /api/auth/me, /login and /register. Never includes the hash. */
export interface CurrentUser {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: Role;
  status: AccountStatus;
  /** Camps this user coordinates (empty for volunteers). */
  campIds: string[];
  volunteer: {
    district: { slug: string; name: string };
    hometown: string | null;
    skills: VolunteerSkill[];
    available: boolean;
  } | null;
}

// ---------- Response shapes used by the web app (Phase 3) ----------
// These mirror what the API routes return (dates are ISO strings after JSON).

export interface NamedRef {
  id: string;
  name: string;
}
export interface DistrictRef {
  slug: string;
  name: string;
}

export interface Evacuee {
  id: string;
  campId: string;
  fullName: string;
  age: number | null;
  gender: Gender;
  phone: string | null;
  homeAddress: string | null;
  medicalNotes: string | null;
  checkedInAt: string;
  checkedOutAt: string | null;
}

export interface CampNeed {
  id: string;
  campId: string;
  item: string;
  category: SupplyCategory;
  quantityNeeded: number;
  quantityFulfilled: number;
  unit: string;
  priority: Priority;
  status: NeedStatus;
  createdAt: string;
  updatedAt: string;
  /** Present on GET /needs (cross-camp list). */
  camp?: NamedRef & { district: DistrictRef };
}

export interface Donation {
  id: string;
  donorName: string;
  donorPhone: string | null;
  category: SupplyCategory;
  item: string;
  quantity: number;
  status: DonationStatus;
  needId: string | null;
  campId: string | null;
  createdAt: string;
  receivedAt: string | null;
  camp: NamedRef | null;
  need: { id: string; item: string; quantityNeeded: number; quantityFulfilled: number } | null;
}

export interface Incident {
  id: string;
  type: IncidentType;
  severity: Priority;
  status: IncidentStatus;
  description: string;
  locationText: string;
  latitude: number | null;
  longitude: number | null;
  /** Only included for staff. */
  reporterName?: string | null;
  reporterPhone?: string | null;
  createdAt: string;
  updatedAt: string;
  district: DistrictRef;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  status: TaskStatus;
  requiredSkill: VolunteerSkill | null;
  campId: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  camp: NamedRef | null;
  district: DistrictRef;
  assignee: { id: string; fullName: string; phone: string | null } | null;
  createdBy: { id: string; fullName: string };
}

export interface UserListItem {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: Role;
  status: AccountStatus;
  lastLoginAt: string | null;
  createdAt: string;
  volunteerProfile: { skills: VolunteerSkill[]; available: boolean; district: DistrictRef } | null;
  coordinatedCamps: { camp: NamedRef }[];
}

export interface VolunteerListItem {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  status: AccountStatus;
  createdAt: string;
  volunteerProfile: { skills: VolunteerSkill[]; available: boolean; district: DistrictRef } | null;
  _count: { assignedTasks: number };
}
