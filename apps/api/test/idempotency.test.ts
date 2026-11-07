import { randomUUID } from 'node:crypto';
import { beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '../src/db';
import { anIncident, client, createCamp, loginAs, resetDb } from './helpers';

beforeAll(resetDb);

const report = (key: string, body: object = anIncident) =>
  client().post('/api/incidents', body).set('Idempotency-Key', key);

describe('Idempotency-Key', () => {
  it('replays the stored response instead of creating a duplicate', async () => {
    const key = randomUUID();
    const first = await report(key);
    const second = await report(key);
    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(second.body.id).toBe(first.body.id);
    expect(second.headers['idempotent-replayed']).toBe('true');
    expect(await prisma.incidentReport.count({ where: { id: first.body.id } })).toBe(1);
  });

  it('creates exactly one record for simultaneous duplicates', async () => {
    const key = randomUUID();
    const before = await prisma.incidentReport.count();
    const results = await Promise.all(Array.from({ length: 5 }, () => report(key)));
    // The first wins; the others get the replay or "still in progress" (409), never a new row.
    for (const r of results) expect([201, 409]).toContain(r.status);
    expect(await prisma.incidentReport.count()).toBe(before + 1);
  });

  it('rejects a key reused for a different request', async () => {
    const key = randomUUID();
    await report(key);
    const other = await report(key, { ...anIncident, severity: 'LOW' });
    expect(other.status).toBe(422);
    expect(other.body.error.code).toBe('IDEMPOTENCY_KEY_REUSED');
  });

  it('rejects malformed keys', async () => {
    expect((await report('not-a-uuid')).status).toBe(400);
  });

  it('works without a key, as before', async () => {
    const res = await client().post('/api/incidents', anIncident);
    expect(res.status).toBe(201);
  });

  it('remembers business errors too (a full camp stays full on retry)', async () => {
    const camp = await createCamp({ capacity: 1 });
    const coordinator = await loginAs({ role: 'COORDINATOR', campIds: [camp.id] });
    await coordinator.post(`/api/camps/${camp.id}/evacuees`, { fullName: 'First' });

    const key = randomUUID();
    const send = () =>
      coordinator
        .post(`/api/camps/${camp.id}/evacuees`, { fullName: 'Second' })
        .set('Idempotency-Key', key);
    const a = await send();
    const b = await send();
    expect(a.status).toBe(409);
    expect(b.status).toBe(409);
    expect(b.headers['idempotent-replayed']).toBe('true');
  });

  it('does not remember "please log in" (the retry after logging in must run)', async () => {
    const camp = await createCamp();
    const key = randomUUID();
    const anonymous = await client()
      .post(`/api/camps/${camp.id}/evacuees`, { fullName: 'Someone' })
      .set('Idempotency-Key', key);
    expect(anonymous.status).toBe(401);
    expect(await prisma.idempotencyKey.findUnique({ where: { key } })).toBeNull();
  });
});
