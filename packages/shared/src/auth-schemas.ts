import { z } from 'zod';
import { ACCOUNT_STATUSES, PRIORITIES, ROLES, TASK_STATUSES, VOLUNTEER_SKILLS } from './enums';
import { districtSlugSchema, paginationSchema, phoneSchema } from './schemas';

/** Emails are compared case-insensitively, so normalise before validating. */
export const emailSchema = z.string().trim().toLowerCase().pipe(z.email('Enter a valid email'));

/**
 * Length beats complexity rules: a long passphrase is both stronger and easier to
 * remember than "P@ssw0rd!". (NIST SP 800-63B recommends a minimum, a generous max,
 * and no forced symbol rules.) The max stops someone sending a 10 MB "password"
 * to make hashing expensive.
 */
export const passwordSchema = z
  .string()
  .min(10, 'Use at least 10 characters')
  .max(128, 'Use at most 128 characters');

const skillsSchema = z.array(z.enum(VOLUNTEER_SKILLS)).max(VOLUNTEER_SKILLS.length);

// ---------- Auth ----------

/** Public sign-up creates a VOLUNTEER account in PENDING state until staff approve it. */
export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  fullName: z.string().trim().min(1, 'Required').max(150),
  phone: phoneSchema,
  district: districtSlugSchema,
  hometown: z.string().trim().max(150).optional(),
  skills: skillsSchema.default([]),
});

export const loginSchema = z.object({
  email: emailSchema,
  // Don't apply the length rules on login: just check it against the stored hash.
  password: z.string().min(1, 'Required').max(128),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1).max(128),
    newPassword: passwordSchema,
  })
  .refine((d) => d.currentPassword !== d.newPassword, {
    message: 'New password must be different',
    path: ['newPassword'],
  });

export const updateProfileSchema = z.object({
  fullName: z.string().trim().min(1).max(150).optional(),
  phone: phoneSchema.optional(),
  // Volunteer-only fields:
  district: districtSlugSchema.optional(),
  hometown: z.string().trim().max(150).optional(),
  skills: skillsSchema.optional(),
  available: z.boolean().optional(),
});

// ---------- User management (admin) ----------

export const listUsersQuerySchema = paginationSchema.extend({
  role: z.enum(ROLES).optional(),
  status: z.enum(ACCOUNT_STATUSES).optional(),
  q: z.string().trim().max(100).optional(),
});

export const updateUserSchema = z
  .object({
    role: z.enum(ROLES).optional(),
    status: z.enum(ACCOUNT_STATUSES).optional(),
  })
  .refine((d) => d.role || d.status, { message: 'Nothing to update' });

export const setUserCampsSchema = z.object({
  campIds: z.array(z.uuid()).max(50),
});

export const listVolunteersQuerySchema = paginationSchema.extend({
  district: districtSlugSchema.optional(),
  skill: z.enum(VOLUNTEER_SKILLS).optional(),
  available: z.stringbool().optional(),
  /** PENDING lists sign-ups waiting for approval. */
  status: z.enum(['PENDING', 'ACTIVE']).default('ACTIVE'),
});

// ---------- Tasks ----------

export const createTaskSchema = z
  .object({
    title: z.string().trim().min(1).max(150),
    description: z.string().trim().min(1).max(2000),
    priority: z.enum(PRIORITIES).optional(),
    requiredSkill: z.enum(VOLUNTEER_SKILLS).optional(),
    campId: z.uuid().optional(),
    district: districtSlugSchema.optional(),
  })
  .refine((d) => d.campId || d.district, {
    message: 'Give a campId, or a district for field tasks',
    path: ['campId'],
  });

export const updateTaskSchema = z.object({
  title: z.string().trim().min(1).max(150).optional(),
  description: z.string().trim().min(1).max(2000).optional(),
  priority: z.enum(PRIORITIES).optional(),
  requiredSkill: z.enum(VOLUNTEER_SKILLS).nullable().optional(),
  status: z.enum(TASK_STATUSES).optional(),
  /** Staff can (re)assign a task to a volunteer, or pass null to unassign. */
  assigneeId: z.uuid().nullable().optional(),
});

export const listTasksQuerySchema = paginationSchema.extend({
  status: z.enum(TASK_STATUSES).optional(),
  district: districtSlugSchema.optional(),
  campId: z.uuid().optional(),
  mine: z.stringbool().default(false),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
