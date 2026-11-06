import { z } from 'zod';
import { DISTRICTS } from './districts';
import {
  CAMP_STATUSES,
  DONATION_STATUSES,
  GENDERS,
  INCIDENT_STATUSES,
  INCIDENT_TYPES,
  NEED_STATUSES,
  PRIORITIES,
  SUPPLY_CATEGORIES,
} from './enums';

/**
 * Zod schemas describe what valid input looks like. One schema gives us:
 *  - runtime validation (the API rejects bad requests with a clear 400),
 *  - a TypeScript type for free via z.infer,
 *  - and (Phase 3) the same rules in the browser forms.
 * Never trust the client: the API validates even if the form already did.
 */

const text = (max: number) => z.string().trim().min(1, 'Required').max(max);
const optionalText = (max: number) => z.string().trim().max(max).optional();

/** Indian mobile number, optionally prefixed with +91. */
export const phoneSchema = z
  .string()
  .trim()
  .regex(/^(\+91)?[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number');

const districtSlugs = DISTRICTS.map((d) => d.slug);
export const districtSlugSchema = z.enum(districtSlugs as [string, ...string[]]);

const coordinates = {
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
};

export const idParamSchema = z.object({ id: z.uuid('Invalid id') });
export const slugParamSchema = z.object({ slug: districtSlugSchema });

/** Query-string pagination: values arrive as strings, so coerce them to numbers. */
export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

// ---------- Camps ----------

export const createCampSchema = z.object({
  name: text(150),
  address: text(300),
  district: districtSlugSchema,
  capacity: z.number().int().positive().max(100_000),
  contactName: optionalText(100),
  contactPhone: phoneSchema.optional(),
  ...coordinates,
});
export const updateCampSchema = createCampSchema
  .partial()
  .extend({ status: z.enum(CAMP_STATUSES).optional() });
export const listCampsQuerySchema = paginationSchema.extend({
  district: districtSlugSchema.optional(),
  status: z.enum(CAMP_STATUSES).optional(),
  q: z.string().trim().max(100).optional(),
});

// ---------- Evacuees ----------

export const createEvacueeSchema = z.object({
  fullName: text(150),
  age: z.number().int().min(0).max(130).optional(),
  gender: z.enum(GENDERS).optional(),
  phone: phoneSchema.optional(),
  homeAddress: optionalText(300),
  medicalNotes: optionalText(1000),
});
export const updateEvacueeSchema = createEvacueeSchema.partial().extend({
  /** Set true to record that the person has left the camp. */
  checkedOut: z.boolean().optional(),
});
export const listEvacueesQuerySchema = paginationSchema.extend({
  includeCheckedOut: z.stringbool().default(false),
  q: z.string().trim().max(100).optional(),
});

// ---------- Needs ----------

export const createNeedSchema = z.object({
  item: text(150),
  category: z.enum(SUPPLY_CATEGORIES),
  quantityNeeded: z.number().int().positive().max(1_000_000),
  unit: optionalText(30),
  priority: z.enum(PRIORITIES).optional(),
});
export const updateNeedSchema = createNeedSchema
  .partial()
  .extend({ status: z.enum(NEED_STATUSES).optional() });
export const listNeedsQuerySchema = paginationSchema.extend({
  district: districtSlugSchema.optional(),
  status: z.enum(NEED_STATUSES).default('OPEN'),
  priority: z.enum(PRIORITIES).optional(),
  category: z.enum(SUPPLY_CATEGORIES).optional(),
});

// ---------- Donations ----------

export const createDonationSchema = z
  .object({
    donorName: text(150),
    donorPhone: phoneSchema.optional(),
    category: z.enum(SUPPLY_CATEGORIES),
    item: text(150),
    quantity: z.number().int().positive().max(1_000_000),
    needId: z.uuid().optional(),
    campId: z.uuid().optional(),
  })
  .refine((d) => !(d.needId && d.campId), {
    message: 'Give either needId or campId, not both (the camp is taken from the need)',
    path: ['campId'],
  });
/** A pledge can only move forward: to RECEIVED or CANCELLED. */
export const updateDonationSchema = z.object({
  status: z.enum(['RECEIVED', 'CANCELLED']),
});
export const listDonationsQuerySchema = paginationSchema.extend({
  status: z.enum(DONATION_STATUSES).optional(),
  campId: z.uuid().optional(),
});

// ---------- Incidents ----------

export const createIncidentSchema = z.object({
  type: z.enum(INCIDENT_TYPES),
  severity: z.enum(PRIORITIES),
  description: text(2000),
  locationText: text(300),
  district: districtSlugSchema,
  reporterName: optionalText(100),
  reporterPhone: phoneSchema.optional(),
  ...coordinates,
});
export const updateIncidentSchema = z.object({
  status: z.enum(INCIDENT_STATUSES).optional(),
  severity: z.enum(PRIORITIES).optional(),
});
export const listIncidentsQuerySchema = paginationSchema.extend({
  district: districtSlugSchema.optional(),
  status: z.enum(INCIDENT_STATUSES).optional(),
  severity: z.enum(PRIORITIES).optional(),
});

// ---------- Inferred input types ----------

export type CreateCampInput = z.infer<typeof createCampSchema>;
export type UpdateCampInput = z.infer<typeof updateCampSchema>;
export type CreateEvacueeInput = z.infer<typeof createEvacueeSchema>;
export type UpdateEvacueeInput = z.infer<typeof updateEvacueeSchema>;
export type CreateNeedInput = z.infer<typeof createNeedSchema>;
export type UpdateNeedInput = z.infer<typeof updateNeedSchema>;
export type CreateDonationInput = z.infer<typeof createDonationSchema>;
export type CreateIncidentInput = z.infer<typeof createIncidentSchema>;
