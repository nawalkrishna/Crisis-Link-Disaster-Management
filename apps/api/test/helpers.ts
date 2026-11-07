import request from 'supertest';
import type { App } from 'supertest/types';
import { DISTRICTS, type Role } from '@crisislink/shared';
import { createApp } from '../src/app';
import { prisma } from '../src/db';
import { hashPassword } from '../src/auth/password';
import type { AccountStatus } from '../src/generated/prisma/enums';

export const ORIGIN = 'http://localhost:5173';
export const PASSWORD = 'correct horse battery staple';
export const app = createApp();

/** Empty every table except districts (reference data) and Prisma's migration history. */
export async function resetDb() {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename NOT IN ('_prisma_migrations', 'districts')`;
  if (tables.length) {
    await prisma.$executeRawUnsafe(
      `TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(', ')} RESTART IDENTITY CASCADE`,
    );
  }
  for (const d of DISTRICTS) {
    await prisma.district.upsert({ where: { slug: d.slug }, update: {}, create: d });
  }
}

/**
 * A browser-like client: keeps cookies between requests (supertest "agent") and sends the
 * Origin header our CSRF check expects on writes.
 */
export function client(target: App = app) {
  const agent = request.agent(target);
  const withOrigin = <T extends request.Test>(t: T) => t.set('Origin', ORIGIN);
  return {
    get: (url: string) => withOrigin(agent.get(url)),
    post: (url: string, body?: object) =>
      body === undefined ? withOrigin(agent.post(url)) : withOrigin(agent.post(url)).send(body),
    patch: (url: string, body: object) => withOrigin(agent.patch(url)).send(body),
    put: (url: string, body: object) => withOrigin(agent.put(url)).send(body),
    agent,
  };
}
export type Client = ReturnType<typeof client>;

let counter = 0;
const passwordHash = hashPassword(PASSWORD); // hash once: argon2 is deliberately slow

export async function createUser(
  options: {
    role?: Role;
    status?: AccountStatus;
    email?: string;
    campIds?: string[];
    skills?: ('FIRST_AID' | 'DRIVING' | 'MEDICAL')[];
  } = {},
) {
  const role = options.role ?? 'VOLUNTEER';
  counter++;
  return prisma.user.create({
    data: {
      email: options.email ?? `${role.toLowerCase()}${counter}@crisislink.test`,
      fullName: `Test ${role.toLowerCase()} ${counter}`,
      passwordHash: await passwordHash,
      role,
      status: options.status ?? 'ACTIVE',
      ...(role === 'VOLUNTEER' && {
        volunteerProfile: {
          create: {
            district: { connect: { slug: 'wayanad' } },
            skills: options.skills ?? [],
          },
        },
      }),
      ...(options.campIds && {
        coordinatedCamps: { create: options.campIds.map((campId) => ({ campId })) },
      }),
    },
  });
}

/** A logged-in client for a new user. */
export async function loginAs(options: Parameters<typeof createUser>[0] = {}, target?: App) {
  const user = await createUser(options);
  const c = client(target);
  const res = await c.post('/api/auth/login', { email: user.email, password: PASSWORD });
  if (res.status !== 200)
    throw new Error(`login failed: ${res.status} ${JSON.stringify(res.body)}`);
  return Object.assign(c, { user });
}

export function createCamp(
  overrides: Partial<{
    name: string;
    capacity: number;
    status: 'OPEN' | 'FULL' | 'CLOSED';
    district: string;
    latitude: number;
    longitude: number;
  }> = {},
) {
  const { district = 'wayanad', ...data } = overrides;
  return prisma.reliefCamp.create({
    data: {
      name: 'Test Camp',
      address: 'Test address',
      capacity: 100,
      ...data,
      district: { connect: { slug: district } },
    },
  });
}

export const anIncident = {
  type: 'FLOOD',
  severity: 'HIGH',
  description: 'Water rising near the school.',
  locationText: 'Test village',
  district: 'wayanad',
} as const;
