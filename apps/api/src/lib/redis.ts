import { createClient, type RedisClientType } from 'redis';
import { config } from '../config';
import { logger } from './logger';

/**
 * REDIS (optional) - what changes when the API runs on MORE THAN ONE SERVER.
 *
 * Most state already lives in PostgreSQL (sessions, idempotency keys, the SMS queue), so any
 * server can handle any request. Two things were in each server's MEMORY:
 *  1. rate-limit counters - with 3 servers, an attacker would get 3x the login attempts;
 *  2. Socket.IO rooms - an event published on server A wouldn't reach sockets on server B.
 * Redis, a fast shared in-memory store, fixes both (see lib/security.ts and realtime.ts).
 *
 * Without REDIS_URL everything works as before on a single server.
 *
 * Top-level `await`: the connection is ready before any other module uses it.
 */
async function connect(url: string) {
  const client: RedisClientType = createClient({ url });
  client.on('error', (err) => logger.error({ err }, 'redis error'));
  await client.connect();
  logger.info('connected to redis');
  return client;
}

export const redis = config.redisUrl ? await connect(config.redisUrl) : undefined;
