import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/prisma/client';
import { config } from './config';

/**
 * One PrismaClient for the whole process. It keeps a pool of database
 * connections; creating a client per request would exhaust PostgreSQL quickly.
 * Prisma 7 talks to PostgreSQL through a "driver adapter" (here: node-postgres).
 */
const adapter = new PrismaPg({
  connectionString: config.databaseUrl,
  // TIME ZONES: Prisma stores DateTime as UTC in `timestamp` (no time zone) columns. Raw SQL
  // like now() and column DEFAULTs use the session's time zone - on an Indian server that's
  // IST, 5h30 ahead, so retry times compared against now() were off by hours (a test caught
  // this). Making every session UTC keeps raw SQL and Prisma in agreement.
  options: '-c TimeZone=UTC',
});

export const prisma = new PrismaClient({
  adapter,
  log: config.nodeEnv === 'development' ? ['warn', 'error'] : ['error'],
});
