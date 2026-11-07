import { Router } from 'express';
import {
  listSmsQuerySchema,
  subscribeAlertsSchema,
  unsubscribeAlertsSchema,
  verifyAlertsSchema,
  type AlertStats,
  type SmsLogItem,
  type SmsStatus,
  type SubscribeAlertsResponse,
} from '@crisislink/shared';
import { prisma } from '../db';
import { requireAdmin } from '../auth/policies';
import { HttpError, notFound, parse } from '../lib/http';
import { alertSignupLimiter, alertVerifyLimiter } from '../lib/security';
import {
  OTP_MAX_ATTEMPTS,
  OTP_TTL_MS,
  hashOtp,
  newOtp,
  newUnsubscribeCode,
  otpMatches,
  otpText,
} from '../sms/alerts';
import { maskPhone, toE164 } from '../sms/provider';

/**
 * SMS ALERTS - anyone can subscribe a phone number to a district's alerts.
 *
 * DOUBLE OPT-IN: without it, anybody could type someone else's number and flood them with
 * messages (and we'd pay for it). So: request -> we SMS a 6-digit code -> type it back.
 * Abuse limits: per-IP rate limit, max 3 codes per number per hour, max 5 guesses per code,
 * codes expire after 10 minutes and are stored only as hashes.
 */
export const alertsRouter = Router();

const CODES_PER_PHONE_PER_HOUR = 3;
const invalidCode = () => new HttpError(400, 'INVALID_CODE', 'That code is not correct');

alertsRouter.post('/alerts/subscribe', alertSignupLimiter, async (req, res) => {
  const input = parse(subscribeAlertsSchema, req.body);
  const phone = toE164(input.phone);
  const district = await prisma.district.findUniqueOrThrow({ where: { slug: input.district } });

  const recentCodes = await prisma.smsMessage.count({
    where: { to: phone, purpose: 'OTP', createdAt: { gt: new Date(Date.now() - 60 * 60_000) } },
  });
  if (recentCodes >= CODES_PER_PHONE_PER_HOUR) {
    throw new HttpError(429, 'RATE_LIMITED', 'Too many codes for this number - try again later');
  }

  const code = newOtp();
  const subscription = await prisma.$transaction(async (tx) => {
    const sub = await tx.alertSubscription.upsert({
      where: { phone_districtId: { phone, districtId: district.id } },
      create: { phone, districtId: district.id, unsubscribeCode: newUnsubscribeCode() },
      update: {},
    });
    await tx.alertSubscription.update({
      where: { id: sub.id },
      data: {
        otpHash: hashOtp(sub.id, code),
        otpExpiresAt: new Date(Date.now() + OTP_TTL_MS),
        otpAttempts: 0,
      },
    });
    // Outbox: the code is queued in the same transaction; the worker sends it within seconds.
    await tx.smsMessage.create({
      data: { to: phone, body: otpText(code, district.name), purpose: 'OTP' },
    });
    return sub;
  });

  // Same answer whether or not the number was already subscribed (no information leak).
  const body: SubscribeAlertsResponse = {
    subscriptionId: subscription.id,
    sentTo: maskPhone(phone),
  };
  res.status(202).json(body); // 202 Accepted: the SMS is queued, not yet delivered
});

alertsRouter.post('/alerts/verify', alertVerifyLimiter, async (req, res) => {
  const { subscriptionId, code } = parse(verifyAlertsSchema, req.body);

  // Count the guess BEFORE checking it, atomically, so parallel guesses can't exceed the limit.
  const { count } = await prisma.alertSubscription.updateMany({
    where: { id: subscriptionId, otpHash: { not: null }, otpAttempts: { lt: OTP_MAX_ATTEMPTS } },
    data: { otpAttempts: { increment: 1 } },
  });
  const sub = await prisma.alertSubscription.findUnique({
    where: { id: subscriptionId },
    include: { district: true },
  });
  if (!sub?.otpHash) throw invalidCode();
  if (count === 0) {
    throw new HttpError(429, 'TOO_MANY_ATTEMPTS', 'Too many wrong codes - request a new one');
  }
  if (!sub.otpExpiresAt || sub.otpExpiresAt < new Date()) {
    throw new HttpError(400, 'CODE_EXPIRED', 'This code has expired - request a new one');
  }
  if (!otpMatches(sub.otpHash, sub.id, code)) throw invalidCode();

  await prisma.alertSubscription.update({
    where: { id: sub.id },
    data: { verifiedAt: sub.verifiedAt ?? new Date(), otpHash: null, otpExpiresAt: null },
  });
  res.json({ ok: true, district: { slug: sub.district.slug, name: sub.district.name } });
});

/** The "stop alerts" page shows what will be cancelled before the person confirms. */
alertsRouter.get('/alerts/subscription/:code', async (req, res) => {
  const { code } = parse(unsubscribeAlertsSchema, req.params);
  const sub = await prisma.alertSubscription.findUnique({
    where: { unsubscribeCode: code },
    include: { district: true },
  });
  if (!sub) throw notFound('Subscription');
  res.json({ phone: maskPhone(sub.phone), district: sub.district.name });
});

/**
 * Unsubscribing is a POST behind a button, not a plain GET link: SMS and chat apps "preview"
 * links by fetching them, which would otherwise unsubscribe people by accident.
 */
alertsRouter.post('/alerts/unsubscribe', async (req, res) => {
  const { code } = parse(unsubscribeAlertsSchema, req.body);
  const { count } = await prisma.alertSubscription.deleteMany({ where: { unsubscribeCode: code } });
  if (count === 0) throw notFound('Subscription');
  res.json({ ok: true });
});

// ---------- Admin: is it working? ----------

alertsRouter.get('/admin/sms', requireAdmin, async (req, res) => {
  const { limit, offset, status } = parse(listSmsQuerySchema, req.query);
  const where = status ? { status } : {};
  const [rows, total] = await prisma.$transaction([
    prisma.smsMessage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.smsMessage.count({ where }),
  ]);
  const items: SmsLogItem[] = rows.map((m) => ({
    id: m.id,
    to: maskPhone(m.to),
    // Even admins don't need to read unsent one-time codes.
    body: m.purpose === 'OTP' ? 'CrisisLink verification code (hidden)' : m.body,
    purpose: m.purpose,
    status: m.status,
    attempts: m.attempts,
    lastError: m.lastError,
    incidentId: m.incidentId,
    createdAt: m.createdAt.toISOString(),
    sentAt: m.sentAt?.toISOString() ?? null,
  }));
  res.json({ items, total, limit, offset });
});

alertsRouter.get('/admin/alerts/stats', requireAdmin, async (_req, res) => {
  const [subscribers, statuses] = await Promise.all([
    prisma.$queryRaw<{ district: string; slug: string; count: number }[]>`
      SELECT d.name AS district, d.slug, count(s.id)::int AS count
      FROM districts d JOIN alert_subscriptions s ON s.district_id = d.id AND s.verified_at IS NOT NULL
      GROUP BY d.id ORDER BY count DESC`,
    prisma.smsMessage.groupBy({ by: ['status'], _count: { _all: true } }),
  ]);
  const sms: Record<SmsStatus, number> = { QUEUED: 0, SENDING: 0, SENT: 0, FAILED: 0 };
  for (const s of statuses) sms[s.status] = s._count._all;
  const body: AlertStats = { subscribers, sms };
  res.json(body);
});
