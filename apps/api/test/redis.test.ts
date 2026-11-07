import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { io as connect, type Socket } from 'socket.io-client';
import type { LiveEvent } from '@crisislink/shared';
import { ORIGIN, anIncident, resetDb } from './helpers';

/**
 * Runs only when TEST_REDIS_URL is set (CI provides a Redis service).
 *
 * Simulates TWO API servers in one process: vi.resetModules() makes the second import a
 * completely separate copy of the app (own Express, own Socket.IO, own rate-limit store).
 * They only share PostgreSQL and Redis - exactly like two containers behind a load balancer.
 */
const REDIS = process.env.TEST_REDIS_URL;

async function startServer() {
  vi.resetModules();
  const { createApp } = await import('../src/app');
  const realtime = await import('../src/realtime');
  const server = createServer(createApp());
  await realtime.attachRealtime(server);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const { redis } = await import('../src/lib/redis');
  return { server, realtime, redis };
}

describe.skipIf(!REDIS)('several API servers sharing Redis', () => {
  let a: Awaited<ReturnType<typeof startServer>>;
  let b: Awaited<ReturnType<typeof startServer>>;
  let socket: Socket;

  beforeAll(async () => {
    process.env.REDIS_URL = REDIS;
    await resetDb();
    a = await startServer();
    b = await startServer();
    await a.redis!.flushDb(); // fresh rate-limit counters
  });
  afterAll(async () => {
    socket?.close();
    await a?.realtime.closeRealtime();
    await b?.realtime.closeRealtime();
    delete process.env.REDIS_URL;
  });

  it('an event published on server A reaches a socket connected to server B', async () => {
    const port = (b.server.address() as AddressInfo).port;
    const events: LiveEvent[] = [];
    socket = connect(`http://localhost:${port}`, {
      transports: ['websocket'],
      extraHeaders: { origin: ORIGIN },
    });
    socket.on('live', (e: LiveEvent) => events.push(e));
    await new Promise<void>((resolve) => socket.on('connect', () => resolve()));

    const res = await request(a.server)
      .post('/api/incidents')
      .set('Origin', ORIGIN)
      .send(anIncident);
    expect(res.status).toBe(201);
    await new Promise((r) => setTimeout(r, 300));
    expect(events.map((e) => e.type)).toContain('incident.changed');
  });

  it('rate limits are shared: failures on A and B count together', async () => {
    const attempt = (server: Server) =>
      request(server)
        .post('/api/auth/login')
        .set('Origin', ORIGIN)
        .send({ email: 'nobody@crisislink.test', password: 'wrong password!' });
    for (let i = 0; i < 5; i++) await attempt(a.server);
    for (let i = 0; i < 5; i++) await attempt(b.server);
    // 10 failures in total across both servers -> the 11th is blocked on either.
    expect((await attempt(a.server)).status).toBe(429);
    expect((await attempt(b.server)).status).toBe(429);
  });
});
