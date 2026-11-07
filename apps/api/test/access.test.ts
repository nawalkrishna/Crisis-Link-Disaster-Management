import { beforeAll, describe, expect, it } from 'vitest';
import { anIncident, client, createCamp, loginAs, resetDb } from './helpers';

beforeAll(resetDb);

describe('CSRF protection', () => {
  it('rejects writes from another website', async () => {
    const res = await client()
      .agent.post('/api/incidents')
      .set('Origin', 'https://evil.example')
      .send(anIncident);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('BAD_ORIGIN');
  });

  it('rejects HTML-form style bodies', async () => {
    const res = await client().post('/api/incidents').type('form').send('type=FLOOD&severity=HIGH');
    expect(res.status).toBe(415);
  });

  it('still allows bodyless POSTs such as logout', async () => {
    const res = await client().post('/api/auth/logout');
    expect(res.status).toBe(204);
  });
});

describe('role-based access', () => {
  it('admin-only routes', async () => {
    const anon = client();
    const volunteer = await loginAs();
    const coordinator = await loginAs({ role: 'COORDINATOR' });
    const admin = await loginAs({ role: 'ADMIN' });
    const camp = { name: 'New', address: 'Somewhere', district: 'wayanad', capacity: 50 };

    expect((await anon.post('/api/camps', camp)).status).toBe(401);
    expect((await volunteer.post('/api/camps', camp)).status).toBe(403);
    expect((await coordinator.post('/api/camps', camp)).status).toBe(403);
    expect((await admin.post('/api/camps', camp)).status).toBe(201);
    expect((await coordinator.get('/api/users')).status).toBe(403);
    expect((await admin.get('/api/users')).status).toBe(200);
  });

  it('coordinators manage only their own camps', async () => {
    const mine = await createCamp({ name: 'Mine' });
    const other = await createCamp({ name: 'Other' });
    const coordinator = await loginAs({ role: 'COORDINATOR', campIds: [mine.id] });

    expect((await coordinator.get(`/api/camps/${mine.id}/evacuees`)).status).toBe(200);
    expect((await coordinator.get(`/api/camps/${other.id}/evacuees`)).status).toBe(403);
    expect((await coordinator.patch(`/api/camps/${other.id}`, { capacity: 5 })).status).toBe(403);
  });

  it('evacuee records are never public', async () => {
    const camp = await createCamp();
    expect((await client().get(`/api/camps/${camp.id}/evacuees`)).status).toBe(401);
    const volunteer = await loginAs();
    expect((await volunteer.get(`/api/camps/${camp.id}/evacuees`)).status).toBe(403);
  });

  it('donor details are staff-only', async () => {
    expect((await client().get('/api/donations')).status).toBe(401);
    const volunteer = await loginAs();
    expect((await volunteer.get('/api/donations')).status).toBe(403);
  });

  it("hides incident reporters' contact details from the public", async () => {
    const created = await client().post('/api/incidents', {
      ...anIncident,
      reporterName: 'Asha',
      reporterPhone: '9400000003',
    });
    expect(created.status).toBe(201);
    expect(created.body.reporterPhone).toBeUndefined();

    const publicView = await client().get(`/api/incidents/${created.body.id}`);
    expect(publicView.body.reporterPhone).toBeUndefined();

    const staff = await loginAs({ role: 'COORDINATOR' });
    const staffView = await staff.get(`/api/incidents/${created.body.id}`);
    expect(staffView.body.reporterPhone).toBe('9400000003');
  });

  it('pending volunteers cannot claim tasks', async () => {
    const pending = await loginAs({ status: 'PENDING' });
    const res = await pending.post('/api/tasks/00000000-0000-4000-8000-000000000000/claim');
    expect(res.status).toBe(403);
  });
});

describe('input validation', () => {
  it('returns per-field errors', async () => {
    const res = await client().post('/api/incidents', { ...anIncident, district: 'atlantis' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.district).toBeDefined();
  });

  it('rejects malformed ids before touching the database', async () => {
    const res = await client().get('/api/camps/not-a-uuid');
    expect(res.status).toBe(400);
  });
});
