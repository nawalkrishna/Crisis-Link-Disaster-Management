import { z } from 'zod';
import { districtSlugSchema, phoneSchema } from './schemas';

/** SMS alert sign-up (double opt-in): request a code, then confirm it. */
export const subscribeAlertsSchema = z.object({
  phone: phoneSchema,
  district: districtSlugSchema,
});
export type SubscribeAlertsInput = z.infer<typeof subscribeAlertsSchema>;

export const verifyAlertsSchema = z.object({
  subscriptionId: z.uuid(),
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'Enter the 6-digit code from the SMS'),
});
export type VerifyAlertsInput = z.infer<typeof verifyAlertsSchema>;

export const unsubscribeAlertsSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9_-]{8,32}$/, 'Invalid link'),
});

export const listSmsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  status: z.enum(['QUEUED', 'SENDING', 'SENT', 'FAILED']).optional(),
});

export const SMS_STATUSES = ['QUEUED', 'SENDING', 'SENT', 'FAILED'] as const;
export type SmsStatus = (typeof SMS_STATUSES)[number];
export const SMS_PURPOSES = ['OTP', 'INCIDENT_ALERT'] as const;
export type SmsPurpose = (typeof SMS_PURPOSES)[number];

export interface SubscribeAlertsResponse {
  subscriptionId: string;
  /** Masked number the code was sent to, e.g. "+91 ••••••0001". */
  sentTo: string;
}

export interface SmsLogItem {
  id: string;
  to: string;
  body: string;
  purpose: SmsPurpose;
  status: SmsStatus;
  attempts: number;
  lastError: string | null;
  incidentId: string | null;
  createdAt: string;
  sentAt: string | null;
}

export interface AlertStats {
  subscribers: { district: string; slug: string; count: number }[];
  sms: Record<SmsStatus, number>;
}
