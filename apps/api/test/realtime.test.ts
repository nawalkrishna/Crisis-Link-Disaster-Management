import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { io as connect, type Socket } from 'socket.io-client';
import type { LiveEvent } from '@crisislink/shared';
import { attachRealtime, closeRealtime } from '../src/realtime';
import {
  ORIGIN,
  PASSWORD,
  anIncident,
  app,
  client,
  createCamp,
  createUser,
  resetDb,
} from './helpers';

let server: Server;
let url: string;
const sockets: Socket[] = [];

beforeAll(async () => {
  await resetDb();
  server = createServer(app);
  await attachRealtime(server);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  url = `http://localhost:${(server.address() as AddressInfo).port}`;
});
afterAll(async () => {
  for (const s of sockets) s.close();
  await closeRealtime();
});

/** Open a socket the way a browser would (Origin + optional session cookie). */
function openSocket(options: { cookie?: string; origin?: string } = {}) {
  return new Promise<{ socket: Socket; events: LiveEvent[] }>((resolve, reject) => {
    const events: LiveEvent[] = [];
    const socket = connect(url, {
      transports: ['websocket'],
      reconnection: false,
      extraHeaders: {
        origin: options.origin ?? ORIGIN,
        ...(options.cookie && { cookie: options.cookie }),
      },
    });
    sockets.push(socket);
    socket.on('live', (e: LiveEvent) => events.push(e));
    socket.on('connect', () => resolve({ socket, events }));
    socket.on('connect_error', reject);
  });
}

async function sessionCookie(role: 'VOLUNTEER' | 'COORDINATOR' | 'ADMIN', campIds?: string[]) {
  const user = await createUser({ role, campIds });
  const api = client(server);
  const res = await api.post('/api/auth/login', { email: user.email, password: PASSWORD });
  const cookie = (res.headers['set-cookie'] as unknown as string[])[0]!.split(';')[0]!;
  return { api, cookie, user };
}
const settle = () => new Promise((r) => setTimeout(r, 200));

describe('live updates', () => {
  it('refuses sockets from other websites (cross-site WebSocket hijacking)', async () => {
    await expect(openSocket({ origin: 'https://evil.example' })).rejects.toThrow();
  });

  it('sends public changes to everyone and task changes only to members', async () => {
    const anon = await openSocket();
    const volunteer = await sessionCookie('VOLUNTEER');
    const member = await openSocket({ cookie: volunteer.cookie });

    await client(server).post('/api/incidents', anIncident);
    const camp = await createCamp();
    const coordinator = await sessionCookie('COORDINATOR', [camp.id]);
    await coordinator.api.post('/api/tasks', {
      title: 'Cook lunch',
      description: 'For 200 people.',
      campId: camp.id,
      district: 'wayanad',
    });
    await settle();

    expect(anon.events.map((e) => e.type)).toContain('incident.changed');
    expect(anon.events.map((e) => e.type)).not.toContain('tasks.changed');
    expect(member.events.map((e) => e.type)).toContain('tasks.changed');
  });

  it('events carry ids only, never personal data', async () => {
    const watcher = await openSocket();
    await client(server).post('/api/incidents', {
      ...anIncident,
      reporterName: 'Secret Name',
      reporterPhone: '9400000999',
    });
    await settle();
    expect(JSON.stringify(watcher.events)).not.toMatch(/Secret Name|9400000999/);
  });

  it("doesn't echo a change back to the tab that made it (X-Socket-Id)", async () => {
    const tab = await openSocket();
    await client(server).post('/api/incidents', anIncident).set('X-Socket-Id', tab.socket.id!);
    await settle();
    expect(tab.events).toHaveLength(0);
  });

  it('logging out closes that session’s socket', async () => {
    const { api, cookie } = await sessionCookie('VOLUNTEER');
    const { socket } = await openSocket({ cookie });
    const closed = new Promise<string>((resolve) => socket.on('disconnect', resolve));
    await api.post('/api/auth/logout');
    expect(await closed).toBe('io server disconnect');
  });

  it('approving a volunteer tells their open tabs and moves them into the members room', async () => {
    const pending = await createUser({ status: 'PENDING' });
    const api = client(server);
    const res = await api.post('/api/auth/login', { email: pending.email, password: PASSWORD });
    const cookie = (res.headers['set-cookie'] as unknown as string[])[0]!.split(';')[0]!;
    const tab = await openSocket({ cookie });

    const admin = await sessionCookie('ADMIN');
    await admin.api.post(`/api/volunteers/${pending.id}/approve`);
    await settle();
    expect(tab.events.map((e) => e.type)).toContain('me.changed');

    const camp = await createCamp();
    const coordinator = await sessionCookie('COORDINATOR', [camp.id]);
    await coordinator.api.post('/api/tasks', {
      title: 'Drive supplies',
      description: 'Van to Meppadi.',
      campId: camp.id,
      district: 'wayanad',
    });
    await settle();
    expect(tab.events.map((e) => e.type)).toContain('tasks.changed');
  });
});
