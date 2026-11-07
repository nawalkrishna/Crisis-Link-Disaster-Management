import { createHash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { config } from '../config';
import type { Prisma } from '../generated/prisma/client';

/** What goes into SMS texts. Short: one SMS is 160 characters (70 for Malayalam/Unicode). */

export const OTP_TTL_MS = 10 * 60_000;
export const OTP_MAX_ATTEMPTS = 5;

/** 6 random digits from a cryptographically secure generator (not Math.random). */
export const newOtp = () => String(randomInt(0, 1_000_000)).padStart(6, '0');

/** Salted with the subscription id so equal codes don't produce equal hashes. */
export const hashOtp = (subscriptionId: string, code: string) =>
  createHash('sha256').update(`${subscriptionId}:${code}`).digest('hex');

/** Constant-time comparison: doesn't leak how many characters matched via response timing. */
export function otpMatches(storedHash: string, subscriptionId: string, code: string) {
  const a = Buffer.from(storedHash, 'hex');
  const b = Buffer.from(hashOtp(subscriptionId, code), 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Short random code for the "stop alerts" link (URL-safe, ~72 bits). */
export const newUnsubscribeCode = () => randomBytes(9).toString('base64url');

export const otpText = (code: string, districtName: string) =>
  `${code} is your CrisisLink code to get alerts for ${districtName}. It expires in 10 minutes. Don't share it.`;

const SEVERITY_WORD = { CRITICAL: 'CRITICAL', HIGH: 'Serious', MEDIUM: '', LOW: '' } as const;

/**
 * Queue an alert for every VERIFIED subscriber of the incident's district, in ONE set-based
 * SQL statement (INSERT ... SELECT) instead of a loop of inserts - 50,000 subscribers is still
 * a single query. `ON CONFLICT DO NOTHING` + the unique (incident_id, to) index makes it safe
 * to call twice. Must run inside the transaction that verifies the incident.
 */
export async function queueIncidentAlerts(
  tx: Prisma.TransactionClient,
  incident: {
    id: string;
    type: string;
    severity: keyof typeof SEVERITY_WORD;
    locationText: string;
    districtId: number;
    districtName: string;
    districtSlug: string;
  },
) {
  const what =
    `${SEVERITY_WORD[incident.severity]} ${incident.type.toLowerCase().replace(/_/g, ' ')}`
      .trim()
      .replace(/^./, (c) => c.toUpperCase());
  const text = `CrisisLink ALERT ${incident.districtName}: ${what} at ${incident.locationText.slice(0, 60)}. Camps & help: ${config.publicWebUrl}/districts/${incident.districtSlug} Stop alerts: ${config.publicWebUrl}/u/`;

  return tx.$executeRaw`
    INSERT INTO sms_messages (id, "to", body, purpose, incident_id, updated_at)
    SELECT gen_random_uuid(), s.phone, ${text}::text || s.unsubscribe_code, 'INCIDENT_ALERT', ${incident.id}::uuid, now()
    FROM alert_subscriptions s
    WHERE s.district_id = ${incident.districtId} AND s.verified_at IS NOT NULL
    ON CONFLICT (incident_id, "to") DO NOTHING`;
}
