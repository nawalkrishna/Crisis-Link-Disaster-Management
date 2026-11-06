import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/prisma/client';
import { config } from './config';

/**
 * One PrismaClient for the whole process. It keeps a pool of database
 * connections; creating a client per request would exhaust PostgreSQL quickly.
 * Prisma 7 talks to PostgreSQL through a "driver adapter" (here: node-postgres).
 */
const adapter = new PrismaPg({ connectionString: config.databaseUrl });

export const prisma = new PrismaClient({
  adapter,
  log: config.nodeEnv === 'development' ? ['warn', 'error'] : ['error'],
});
