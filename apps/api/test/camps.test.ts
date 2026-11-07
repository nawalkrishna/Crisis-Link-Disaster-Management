import { beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '../src/db';
import { client, createCamp, loginAs, resetDb } from './helpers';

beforeAll(resetDb);

describe('camp capacity', () => {
  it('never overfills a camp, even with simultaneous check-ins (row lock)', async () => {
    const camp = await createCamp({ capacity: 3 });
    const coordinator = await loginAs({ role: 'COORDINATOR', campIds: [camp.id] });

    const results = await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        coordinator.post(`/api/camps/${camp.id}/evacuees`, { fullName: `Person ${i}` }),
      ),
    );
    const statuses = results.map((r) => r.status).sort();
    expect(statuses.filter((s) => s === 201)).toHaveLength(3);
    expect(statuses.filter((s) => s === 409)).toHaveLength(7);
    expect(await prisma.evacuee.count({ where: { campId: camp.id } })).toBe(3);

    const after = await client().get(`/api/camps/${camp.id}`);
    expect(after.body).toMatchObject({ occupancy: 3, status: 'FULL' });

    // A check-out frees a place and reopens the camp.
    const someone = await prisma.evacuee.findFirstOrThrow({ where: { campId: camp.id } });
    await coordinator.patch(`/api/evacuees/${someone.id}`, { checkedOut: true });
    const reopened = await client().get(`/api/camps/${camp.id}`);
    expect(reopened.body).toMatchObject({ occupancy: 2, status: 'OPEN' });
  });

  it('refuses check-ins at a closed camp', async () => {
    const camp = await createCamp({ status: 'CLOSED' });
    const coordinator = await loginAs({ role: 'COORDINATOR', campIds: [camp.id] });
    const res = await coordinator.post(`/api/camps/${camp.id}/evacuees`, { fullName: 'Late' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CAMP_CLOSED');
  });
});

describe('maps and nearest camp', () => {
  beforeAll(async () => {
    // Real places: Kalpetta, Meppadi (Wayanad), Aluva (Ernakulam), Thiruvananthapuram.
    await createCamp({ name: 'Kalpetta', latitude: 11.6085, longitude: 76.0827 });
    await createCamp({ name: 'Meppadi', latitude: 11.5551, longitude: 76.1347 });
    await createCamp({
      name: 'Meppadi Full',
      capacity: 1,
      status: 'FULL',
      latitude: 11.556,
      longitude: 76.135,
    });
    await createCamp({
      name: 'Aluva',
      district: 'ernakulam',
      latitude: 10.1076,
      longitude: 76.3516,
    });
    await createCamp({
      name: 'Capital',
      district: 'thiruvananthapuram',
      latitude: 8.5241,
      longitude: 76.9366,
    });
  });

  it('returns the closest camps with space, nearest first', async () => {
    const res = await client().get('/api/camps/nearby?lat=11.52&lng=76.12');
    expect(res.status).toBe(200);
    const names = res.body.items.map((c: { name: string }) => c.name);
    expect(names).toEqual(['Meppadi', 'Kalpetta']); // Aluva is ~170 km away: outside 50 km
    expect(res.body.items[0].distanceKm).toBeCloseTo(4.2, 0);
  });

  it('can include full camps and a bigger radius', async () => {
    const res = await client().get(
      '/api/camps/nearby?lat=11.52&lng=76.12&hasSpace=false&radiusKm=300',
    );
    const names = res.body.items.map((c: { name: string }) => c.name);
    expect(names).toContain('Meppadi Full');
    expect(names).toContain('Aluva');
    expect(names).not.toContain('Capital'); // ~350 km
  });

  it('validates coordinates', async () => {
    expect((await client().get('/api/camps/nearby?lat=95&lng=76')).status).toBe(400);
    expect((await client().get('/api/camps/nearby')).status).toBe(400);
  });

  it('serves map markers, optionally for one district', async () => {
    const all = await client().get('/api/map');
    expect(all.body.camps.length).toBeGreaterThanOrEqual(5);
    const wayanad = await client().get('/api/map?district=wayanad');
    expect(wayanad.body.camps.every((c: { district: string }) => c.district === 'Wayanad')).toBe(
      true,
    );
  });
});
