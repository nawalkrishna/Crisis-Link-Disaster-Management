import { createHash } from 'node:crypto';
import { beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '../src/db';
import { PASSWORD, client, createUser, loginAs, resetDb } from './helpers';

beforeAll(resetDb);

const sessionCookie = (res: { headers: Record<string, unknown> }) =>
  ((res.headers['set-cookie'] as string[] | undefined) ?? []).find((c) =>
    c.startsWith('cl_session='),
  );

describe('registration', () => {
  it('creates a PENDING volunteer and logs them in with a safe cookie', async () => {
    const api = client();
    const res = await api.post('/api/auth/register', {
      email: 'New.Volunteer@Example.com',
      password: 'a long enough password',
      fullName: 'New Volunteer',
      phone: '9400000001',
      district: 'wayanad',
      skills: ['FIRST_AID'],
    });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      email: 'new.volunteer@example.com', // normalised to lower case
      role: 'VOLUNTEER',
      status: 'PENDING',
    });
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');

    const cookie = sessionCookie(res)!;
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);

    const me = await api.get('/api/auth/me');
    expect(me.status).toBe(200);
  });

  it('rejects a duplicate email and a weak password', async () => {
    const api = client();
    const base = {
      fullName: 'Someone',
      phone: '9400000002',
      district: 'wayanad',
      skills: [],
    };
    const dup = await api.post('/api/auth/register', {
      ...base,
      email: 'new.volunteer@example.com',
      password: 'another long password',
    });
    expect(dup.status).toBe(409);

    const weak = await api.post('/api/auth/register', {
      ...base,
      email: 'weak@example.com',
      password: 'short',
    });
    expect(weak.status).toBe(400);
    expect(weak.body.error.details.password).toBeDefined();
  });
});

describe('login and sessions', () => {
  it('gives the same answer for an unknown email and a wrong password (no enumeration)', async () => {
    const user = await createUser();
    const api = client();
    const unknown = await api.post('/api/auth/login', {
      email: 'nobody@crisislink.test',
      password: PASSWORD,
    });
    const wrong = await api.post('/api/auth/login', { email: user.email, password: 'wrong!!!!!!' });
    expect(unknown.status).toBe(401);
    expect(wrong.status).toBe(401);
    expect(unknown.body.error).toEqual(wrong.body.error);
  });

  it('stores only a hash of the session token', async () => {
    const user = await createUser();
    const api = client();
    const res = await api.post('/api/auth/login', { email: user.email, password: PASSWORD });
    const token = sessionCookie(res)!.split(';')[0]!.split('=')[1]!;
    const sessions = await prisma.session.findMany({ where: { userId: user.id } });
    expect(sessions).toHaveLength(1);
    expect(sessions[0]!.id).not.toBe(token);
    expect(sessions[0]!.id).toBe(createHash('sha256').update(token).digest('hex'));
  });

  it('logs out', async () => {
    const api = await loginAs();
    expect((await api.post('/api/auth/logout')).status).toBe(204);
    expect((await api.get('/api/auth/me')).status).toBe(401);
  });

  it('changing the password logs out other devices but not this one', async () => {
    const user = await createUser();
    const laptop = client();
    const phone = client();
    await laptop.post('/api/auth/login', { email: user.email, password: PASSWORD });
    await phone.post('/api/auth/login', { email: user.email, password: PASSWORD });

    const res = await laptop.post('/api/auth/change-password', {
      currentPassword: PASSWORD,
      newPassword: 'a brand new password',
    });
    expect(res.status).toBe(200);
    expect(res.body.otherSessionsRevoked).toBe(1);
    expect((await laptop.get('/api/auth/me')).status).toBe(200);
    expect((await phone.get('/api/auth/me')).status).toBe(401);
  });

  it('suspension ends existing sessions immediately and blocks login', async () => {
    const admin = await loginAs({ role: 'ADMIN' });
    const volunteer = await loginAs();
    const res = await admin.patch(`/api/users/${volunteer.user.id}`, { status: 'SUSPENDED' });
    expect(res.status).toBe(200);
    expect((await volunteer.get('/api/auth/me')).status).toBe(401);

    const again = await client().post('/api/auth/login', {
      email: volunteer.user.email,
      password: PASSWORD,
    });
    expect(again.status).toBe(403);
    expect(again.body.error.code).toBe('ACCOUNT_SUSPENDED');
  });

  it('an admin cannot lock themselves out', async () => {
    const admin = await loginAs({ role: 'ADMIN' });
    const res = await admin.patch(`/api/users/${admin.user.id}`, { role: 'VOLUNTEER' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('SELF_LOCKOUT');
  });
});

// Last in the file: it uses up this IP's failed-login budget.
describe('rate limiting', () => {
  it('blocks after 10 failed logins', async () => {
    const user = await createUser();
    const api = client();
    const statuses: number[] = [];
    for (let i = 0; i < 12; i++) {
      const res = await api.post('/api/auth/login', {
        email: user.email,
        password: 'nope-nope-nope',
      });
      statuses.push(res.status);
    }
    // Earlier tests in this file already used a few failures; the limit kicks in at 10.
    expect(statuses).toContain(429);
    expect(statuses.at(-1)).toBe(429);
  });
});
