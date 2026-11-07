import { beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '../src/db';
import { client, createCamp, loginAs, resetDb } from './helpers';

beforeAll(resetDb);

describe('donations', () => {
  it('counts a received donation exactly once, even with simultaneous clicks', async () => {
    const camp = await createCamp();
    const need = await prisma.campNeed.create({
      data: { campId: camp.id, item: 'Water', category: 'WATER', quantityNeeded: 100 },
    });
    const pledge = await client().post('/api/donations', {
      donorName: 'Trader',
      category: 'WATER',
      item: 'Water bottles',
      quantity: 100,
      needId: need.id,
    });
    expect(pledge.status).toBe(201);
    expect(pledge.body.campId).toBe(camp.id); // derived from the need

    const coordinator = await loginAs({ role: 'COORDINATOR', campIds: [camp.id] });
    const clicks = await Promise.all(
      Array.from({ length: 5 }, () =>
        coordinator.patch(`/api/donations/${pledge.body.id}`, { status: 'RECEIVED' }),
      ),
    );
    expect(clicks.filter((r) => r.status === 200)).toHaveLength(1);
    expect(clicks.filter((r) => r.status === 409)).toHaveLength(4);

    const after = await prisma.campNeed.findUniqueOrThrow({ where: { id: need.id } });
    expect(after.quantityFulfilled).toBe(100);
    expect(after.status).toBe('FULFILLED');
  });

  it('does not accept pledges for a need that is no longer open', async () => {
    const camp = await createCamp();
    const need = await prisma.campNeed.create({
      data: {
        campId: camp.id,
        item: 'Rice',
        category: 'FOOD',
        quantityNeeded: 10,
        status: 'FULFILLED',
      },
    });
    const res = await client().post('/api/donations', {
      donorName: 'Late donor',
      category: 'FOOD',
      item: 'Rice',
      quantity: 5,
      needId: need.id,
    });
    expect(res.status).toBe(409);
  });
});

describe('volunteer tasks', () => {
  async function newTask(requiredSkill?: 'DRIVING') {
    const camp = await createCamp();
    const coordinator = await loginAs({ role: 'COORDINATOR', campIds: [camp.id] });
    const res = await coordinator.post('/api/tasks', {
      title: 'Deliver water',
      description: 'Take 50 bottles to the school.',
      campId: camp.id,
      district: 'wayanad',
      ...(requiredSkill && { requiredSkill }),
    });
    expect(res.status).toBe(201);
    return { task: res.body as { id: string }, coordinator };
  }

  it('only one of several volunteers can claim the same task', async () => {
    const { task } = await newTask();
    const volunteers = await Promise.all(Array.from({ length: 5 }, () => loginAs()));
    const claims = await Promise.all(volunteers.map((v) => v.post(`/api/tasks/${task.id}/claim`)));
    expect(claims.filter((r) => r.status === 200)).toHaveLength(1);
    expect(claims.filter((r) => r.status === 409)).toHaveLength(4);
  });

  it('checks the required skill', async () => {
    const { task } = await newTask('DRIVING');
    const walker = await loginAs();
    expect((await walker.post(`/api/tasks/${task.id}/claim`)).status).toBe(409);
    const driver = await loginAs({ skills: ['DRIVING'] });
    expect((await driver.post(`/api/tasks/${task.id}/claim`)).status).toBe(200);
  });

  it('follows the state machine', async () => {
    const { task, coordinator } = await newTask();
    const volunteer = await loginAs();
    await volunteer.post(`/api/tasks/${task.id}/claim`);

    // Can't jump from ASSIGNED straight to DONE.
    const skip = await volunteer.patch(`/api/tasks/${task.id}`, { status: 'DONE' });
    expect(skip.status).toBe(409);
    expect(skip.body.error.code).toBe('INVALID_TRANSITION');

    expect((await volunteer.patch(`/api/tasks/${task.id}`, { status: 'IN_PROGRESS' })).status).toBe(
      200,
    );
    const done = await volunteer.patch(`/api/tasks/${task.id}`, { status: 'DONE' });
    expect(done.status).toBe(200);
    expect(done.body.completedAt).toBeTruthy();

    // Volunteers can't edit task details; coordinators can.
    expect((await volunteer.patch(`/api/tasks/${task.id}`, { title: 'Mine now' })).status).toBe(
      403,
    );
    expect((await coordinator.patch(`/api/tasks/${task.id}`, { title: 'Delivered' })).status).toBe(
      200,
    );
  });
});
