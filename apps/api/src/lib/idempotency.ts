import { createHash } from 'node:crypto';
import type { RequestHandler, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { Prisma } from '../generated/prisma/client';
import { HttpError } from './http';

/**
 * IDEMPOTENCY KEYS - "doing it twice has the same effect as doing it once".
 *
 * An offline phone queues "check in Asha" and sends it when the signal returns. If the
 * connection drops AFTER the server saved it but BEFORE the phone got the answer, the phone
 * can't know it worked, so it sends again. Without protection: Asha is checked in twice.
 *
 * The client invents a random UUID per action and sends it as the `Idempotency-Key` header,
 * and re-sends the SAME key on every retry. We:
 *   1. INSERT the key first (the primary key makes a second concurrent insert fail),
 *   2. run the route,
 *   3. store its status + JSON response with the key.
 * A repeat of the key gets the stored response back (with `Idempotent-Replayed: true`).
 * The same pattern is used by payment APIs such as Stripe.
 */

const keySchema = z.uuid();
const TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Responses we remember. Not remembered (so a retry really runs again):
 * 5xx (our fault, may work next time), 401/403 (log in, then retry), 429 (wait, then retry).
 */
const shouldStore = (status: number) => status < 500 && ![401, 403, 429].includes(status);

export const idempotent: RequestHandler = async (req, res, next) => {
  const header = req.get('idempotency-key');
  if (header === undefined) return next(); // optional: online clients may skip it
  const parsedKey = keySchema.safeParse(header);
  if (!parsedKey.success) {
    throw new HttpError(400, 'BAD_IDEMPOTENCY_KEY', 'Idempotency-Key must be a UUID');
  }
  const key = parsedKey.data;

  // Same key + different request (other user, other URL, other body) must not "replay".
  const fingerprint = createHash('sha256')
    .update(JSON.stringify([req.method, req.originalUrl, req.user?.id ?? null, req.body]))
    .digest('hex');

  // INSERT ... ON CONFLICT DO NOTHING: count 0 means the key already existed.
  const { count } = await prisma.idempotencyKey.createMany({
    data: [{ key, fingerprint, expiresAt: new Date(Date.now() + TTL_MS) }],
    skipDuplicates: true,
  });
  if (count === 0) {
    const existing = await prisma.idempotencyKey.findUnique({ where: { key } });
    if (!existing) throw new HttpError(409, 'REQUEST_IN_PROGRESS', 'Please retry');
    if (existing.fingerprint !== fingerprint) {
      throw new HttpError(
        422,
        'IDEMPOTENCY_KEY_REUSED',
        'This Idempotency-Key was used for a different request',
      );
    }
    if (existing.statusCode === null) {
      throw new HttpError(409, 'REQUEST_IN_PROGRESS', 'The original request is still running');
    }
    res.setHeader('Idempotent-Replayed', 'true');
    res.status(existing.statusCode).json(existing.response);
    return;
  }

  // Wrap res.json so whatever the route (or the error handler) sends is saved first.
  const send = res.json.bind(res) as Response['json'];
  res.json = ((body: unknown) => {
    const status = res.statusCode;
    const save = shouldStore(status)
      ? prisma.idempotencyKey.update({
          where: { key },
          data: {
            statusCode: status,
            response: (body ?? Prisma.JsonNull) as Prisma.InputJsonValue,
          },
        })
      : prisma.idempotencyKey.delete({ where: { key } });
    save.then(
      () => send(body),
      () => send(body), // saving failed: still answer; worst case a retry runs again
    );
    return res;
  }) as Response['json'];
  next();
};

/** Housekeeping: forget keys older than a day (called from the background worker). */
export const purgeExpiredIdempotencyKeys = () =>
  prisma.idempotencyKey.deleteMany({ where: { expiresAt: { lt: new Date() } } });
