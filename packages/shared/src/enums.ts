/**
 * Enum values used by the API, the database and the UI.
 * They MUST match the enums in apps/api/prisma/schema.prisma; the API's type-check
 * fails if they drift apart (see apps/api/src/lib/enum-guard.ts).
 */
export const CAMP_STATUSES = ['OPEN', 'FULL', 'CLOSED'] as const;
export const GENDERS = ['MALE', 'FEMALE', 'OTHER', 'UNDISCLOSED'] as const;
export const SUPPLY_CATEGORIES = [
  'FOOD',
  'WATER',
  'MEDICINE',
  'CLOTHING',
  'HYGIENE',
  'BEDDING',
  'OTHER',
] as const;
export const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
export const NEED_STATUSES = ['OPEN', 'FULFILLED', 'CANCELLED'] as const;
export const DONATION_STATUSES = ['PLEDGED', 'RECEIVED', 'CANCELLED'] as const;
export const INCIDENT_TYPES = [
  'FLOOD',
  'LANDSLIDE',
  'FIRE',
  'BUILDING_COLLAPSE',
  'ROAD_BLOCKED',
  'MEDICAL_EMERGENCY',
  'OTHER',
] as const;
export const INCIDENT_STATUSES = ['REPORTED', 'VERIFIED', 'RESOLVED', 'DISMISSED'] as const;

export type CampStatus = (typeof CAMP_STATUSES)[number];
export type Gender = (typeof GENDERS)[number];
export type SupplyCategory = (typeof SUPPLY_CATEGORIES)[number];
export type Priority = (typeof PRIORITIES)[number];
export type NeedStatus = (typeof NEED_STATUSES)[number];
export type DonationStatus = (typeof DONATION_STATUSES)[number];
export type IncidentType = (typeof INCIDENT_TYPES)[number];
export type IncidentStatus = (typeof INCIDENT_STATUSES)[number];

// ---------- Accounts & tasks (Phase 2) ----------

export const ROLES = ['ADMIN', 'COORDINATOR', 'VOLUNTEER'] as const;
export const ACCOUNT_STATUSES = ['PENDING', 'ACTIVE', 'SUSPENDED'] as const;
export const VOLUNTEER_SKILLS = [
  'FIRST_AID',
  'MEDICAL',
  'DRIVING',
  'COOKING',
  'SWIMMING_RESCUE',
  'COUNSELLING',
  'LOGISTICS',
  'TRANSLATION',
  'OTHER',
] as const;
export const TASK_STATUSES = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'DONE', 'CANCELLED'] as const;

export type Role = (typeof ROLES)[number];
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];
export type VolunteerSkill = (typeof VOLUNTEER_SKILLS)[number];
export type TaskStatus = (typeof TASK_STATUSES)[number];
