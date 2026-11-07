import { prisma } from '../db';
import { purgeExpiredIdempotencyKeys } from '../lib/idempotency';
import { maskPhone, smsProvider } from './provider';

/**
 * THE OUTBOX WORKER
 *
 * Routes never call the SMS provider directly. They INSERT rows into `sms_messages` inside the
 * same database transaction as the change that caused them (e.g. verifying an incident).
 * So either both happen or neither does - no "incident verified but alert lost because the
 * SMS API was down", and the HTTP request doesn't wait for a slow gateway.
 *
 * This loop then picks up due messages and sends them:
 *  - `FOR UPDATE SKIP LOCKED` lets several API servers run the worker at once without two of
 *    them grabbing the same message (each skips rows another has locked).
 *  - Failures are retried with EXPONENTIAL BACKOFF (20 s, 40 s, 80 s ... + random jitter so a
 *    recovering provider isn't hit by every retry at the same instant), then marked FAILED.
 *  - Delivery is AT-LEAST-ONCE: if the server crashes after the provider accepted a message but
 *    before we marked it SENT, it will be sent again after the stuck-timeout. For alerts,
 *    a rare duplicate is far better than a lost warning.
 */

const BATCH = 20;
const MAX_ATTEMPTS = 5;
const POLL_MS = 3_000;
const STUCK_AFTER_MS = 5 * 60_000;

interface Claimed {
  id: string;
  to: string;
  body: string;
  purpose: 'OTP' | 'INCIDENT_ALERT';
  attempts: number;
}

/** Atomically mark up to BATCH due messages as SENDING and return them. */
function claimBatch() {
  return prisma.$queryRaw<Claimed[]>`
    UPDATE sms_messages SET status = 'SENDING', attempts = attempts + 1, updated_at = now()
    WHERE id IN (
      SELECT id FROM sms_messages
      WHERE status = 'QUEUED' AND next_attempt_at <= now()
      ORDER BY purpose, created_at   -- OTPs first: someone is waiting for that code
      LIMIT ${BATCH}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING id, "to", body, purpose::text AS purpose, attempts`;
}

async function deliver(msg: Claimed) {
  try {
    const { providerId } = await smsProvider.send(msg.to, msg.body);
    await prisma.smsMessage.update({
      where: { id: msg.id },
      data: {
        status: 'SENT',
        sentAt: new Date(),
        providerId,
        lastError: null,
        // A sent code has no business staying readable in the database.
        ...(msg.purpose === 'OTP' && { body: 'CrisisLink verification code (redacted)' }),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const permanent = smsProvider.isPermanentError?.(err) ?? false;
    const giveUp = permanent || msg.attempts >= MAX_ATTEMPTS;
    const delayMs = 10_000 * 2 ** msg.attempts * (0.75 + Math.random() * 0.5);
    await prisma.smsMessage.update({
      where: { id: msg.id },
      data: {
        status: giveUp ? 'FAILED' : 'QUEUED',
        lastError: message.slice(0, 500),
        nextAttemptAt: new Date(Date.now() + delayMs),
      },
    });
    console.warn(
      `[sms] ${giveUp ? 'gave up on' : 'will retry'} ${maskPhone(msg.to)} (attempt ${msg.attempts}): ${message}`,
    );
  }
}

/** One pass of the loop. Exported so scripts/tests can run it on demand. */
export async function processSmsOutbox() {
  // Messages stuck in SENDING (server crashed mid-send) go back to the queue.
  await prisma.smsMessage.updateMany({
    where: { status: 'SENDING', updatedAt: { lt: new Date(Date.now() - STUCK_AFTER_MS) } },
    data: { status: 'QUEUED' },
  });
  let total = 0;
  for (;;) {
    const batch = await claimBatch();
    if (batch.length === 0) return total;
    await Promise.all(batch.map(deliver));
    total += batch.length;
  }
}

let timer: NodeJS.Timeout | undefined;
let running = false;
let lastPurge = 0;

export function startBackgroundWorker() {
  console.log(`SMS worker started (provider: ${smsProvider.name})`);
  timer = setInterval(() => {
    if (running) return; // previous pass still busy: don't overlap
    running = true;
    void (async () => {
      try {
        await processSmsOutbox();
        if (Date.now() - lastPurge > 60 * 60_000) {
          lastPurge = Date.now();
          await purgeExpiredIdempotencyKeys();
        }
      } catch (err) {
        console.error('[worker] pass failed:', err);
      } finally {
        running = false;
      }
    })();
  }, POLL_MS);
}

export function stopBackgroundWorker() {
  if (timer) clearInterval(timer);
}
