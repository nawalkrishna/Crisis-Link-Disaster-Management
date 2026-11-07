import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/db';
import { memoryOutbox } from '../src/sms/provider';
import { processSmsOutbox } from '../src/sms/worker';
import { anIncident, client, loginAs, resetDb } from './helpers';

beforeAll(resetDb);
beforeEach(() => {
  memoryOutbox.sent.length = 0;
  memoryOutbox.failNext = 0;
});

/** Request a code and return it the way a phone would receive it. */
async function requestCode(phone: string, district = 'wayanad') {
  const res = await client().post('/api/alerts/subscribe', { phone, district });
  expect(res.status).toBe(202);
  await processSmsOutbox(); // what the background worker does every few seconds
  const sms = memoryOutbox.sent.filter((m) => m.to === `+91${phone}`).at(-1);
  const code = sms?.body.match(/^(\d{6}) /)?.[1];
  expect(code).toBeDefined();
  return { subscriptionId: res.body.subscriptionId as string, code: code! };
}

const verify = (subscriptionId: string, code: string) =>
  client().post('/api/alerts/verify', { subscriptionId, code });

describe('double opt-in sign-up', () => {
  it('texts a code and turns alerts on only with the right code', async () => {
    const { subscriptionId, code } = await requestCode('9400000101');
    const wrong = code === '000000' ? '111111' : '000000';
    expect((await verify(subscriptionId, wrong)).status).toBe(400);
    const ok = await verify(subscriptionId, code);
    expect(ok.status).toBe(200);
    expect(ok.body.district.slug).toBe('wayanad');
    // A code works once.
    expect((await verify(subscriptionId, code)).status).toBe(400);
  });

  it('never stores the code in readable form', async () => {
    const { subscriptionId, code } = await requestCode('9400000102');
    const sub = await prisma.alertSubscription.findUniqueOrThrow({ where: { id: subscriptionId } });
    expect(sub.otpHash).not.toContain(code);
    const sms = await prisma.smsMessage.findFirstOrThrow({ where: { to: '+919400000102' } });
    expect(sms.status).toBe('SENT');
    expect(sms.body).not.toContain(code); // redacted after sending
  });

  it('allows only 5 guesses per code', async () => {
    const { subscriptionId, code } = await requestCode('9400000103');
    const wrong = code === '000000' ? '111111' : '000000';
    for (let i = 0; i < 5; i++) await verify(subscriptionId, wrong);
    const sixth = await verify(subscriptionId, code); // even the right code is refused now
    expect(sixth.status).toBe(429);
    expect(sixth.body.error.code).toBe('TOO_MANY_ATTEMPTS');
  });

  it('limits codes per phone number', async () => {
    for (let i = 0; i < 3; i++) {
      const res = await client().post('/api/alerts/subscribe', {
        phone: '9400000104',
        district: 'idukki',
      });
      expect(res.status).toBe(202);
    }
    const fourth = await client().post('/api/alerts/subscribe', {
      phone: '9400000104',
      district: 'idukki',
    });
    expect(fourth.status).toBe(429);
  });
});

describe('incident alerts', () => {
  it('alerts verified subscribers only when staff verify a serious incident, once', async () => {
    // Kannur: no other test in this file has subscribers there.
    const a = await requestCode('9400000201', 'kannur');
    await verify(a.subscriptionId, a.code);
    await requestCode('9400000202', 'kannur'); // never verified -> no alerts
    memoryOutbox.sent.length = 0;

    const incident = await client().post('/api/incidents', {
      ...anIncident,
      district: 'kannur',
      severity: 'LOW',
    });
    const staff = await loginAs({ role: 'COORDINATOR' });

    const low = await staff.patch(`/api/incidents/${incident.body.id}`, { status: 'VERIFIED' });
    expect(low.body.alertsQueued).toBe(0); // verified but not serious

    const critical = await staff.patch(`/api/incidents/${incident.body.id}`, {
      severity: 'CRITICAL',
    });
    expect(critical.body.alertsQueued).toBe(1);
    const again = await staff.patch(`/api/incidents/${incident.body.id}`, { severity: 'CRITICAL' });
    expect(again.body.alertsQueued).toBe(0); // never twice for the same incident + phone

    await processSmsOutbox();
    expect(memoryOutbox.sent).toHaveLength(1);
    expect(memoryOutbox.sent[0]!.to).toBe('+919400000201');
    expect(memoryOutbox.sent[0]!.body).toMatch(/^CrisisLink ALERT Kannur: CRITICAL flood/);
    expect(memoryOutbox.sent[0]!.body).toMatch(/\/u\/[\w-]+$/); // personal stop link
  });

  it('retries when the SMS provider fails, then delivers', async () => {
    const { subscriptionId } = await requestCode('9400000301').catch(() => ({
      subscriptionId: '',
    }));
    expect(subscriptionId).not.toBe('');
    await prisma.smsMessage.create({
      data: { to: '+919400000301', body: 'retry me', purpose: 'INCIDENT_ALERT' },
    });
    memoryOutbox.failNext = 1;
    await processSmsOutbox();
    const failed = await prisma.smsMessage.findFirstOrThrow({ where: { body: 'retry me' } });
    expect(failed).toMatchObject({ status: 'QUEUED', attempts: 1 });
    expect(failed.lastError).toContain('Simulated provider outage');
    expect(failed.nextAttemptAt.getTime()).toBeGreaterThan(Date.now()); // backed off

    // Time passes...
    await prisma.smsMessage.update({
      where: { id: failed.id },
      data: { nextAttemptAt: new Date() },
    });
    await processSmsOutbox();
    const sent = await prisma.smsMessage.findUniqueOrThrow({ where: { id: failed.id } });
    expect(sent).toMatchObject({ status: 'SENT', attempts: 2 });
  });

  it('gives up after 5 attempts', async () => {
    const msg = await prisma.smsMessage.create({
      data: { to: '+919400000302', body: 'doomed', purpose: 'INCIDENT_ALERT', attempts: 4 },
    });
    memoryOutbox.failNext = 1;
    await processSmsOutbox();
    expect((await prisma.smsMessage.findUniqueOrThrow({ where: { id: msg.id } })).status).toBe(
      'FAILED',
    );
  });
});

describe('unsubscribe and admin log', () => {
  it('stops alerts via the code in the link', async () => {
    const { subscriptionId, code } = await requestCode('9400000401');
    await verify(subscriptionId, code);
    const sub = await prisma.alertSubscription.findUniqueOrThrow({ where: { id: subscriptionId } });

    const info = await client().get(`/api/alerts/subscription/${sub.unsubscribeCode}`);
    expect(info.body).toEqual({ phone: '+91 ••••••0401', district: 'Wayanad' });
    expect(
      (await client().post('/api/alerts/unsubscribe', { code: sub.unsubscribeCode })).status,
    ).toBe(200);
    expect(await prisma.alertSubscription.findUnique({ where: { id: subscriptionId } })).toBeNull();
  });

  it('admin log masks numbers and hides codes; admin only', async () => {
    expect((await client().get('/api/admin/sms')).status).toBe(401);
    const admin = await loginAs({ role: 'ADMIN' });
    const res = await admin.get('/api/admin/sms');
    expect(res.status).toBe(200);
    for (const m of res.body.items as { to: string; body: string; purpose: string }[]) {
      expect(m.to).toMatch(/^\+91 ••••••\d{4}$/);
      if (m.purpose === 'OTP') expect(m.body).not.toMatch(/\d{6}/);
    }
  });
});
