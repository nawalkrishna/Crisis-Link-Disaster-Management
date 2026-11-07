import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { E2E_PASSWORD, e2eDatabaseUrl } from './env';

/**
 * Before the browser tests: a fresh e2e database with the standard sample data
 * (districts, camps, incidents, and admin@ / coordinator@ / volunteer@ crisislink.test).
 */
export default async function globalSetup() {
  const url = new URL(e2eDatabaseUrl());
  const name = decodeURIComponent(url.pathname.slice(1));
  const admin = new URL(url);
  admin.pathname = '/postgres';

  const client = new pg.Client({ connectionString: admin.toString() });
  await client.connect();
  const { rowCount } = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [name]);
  if (!rowCount) await client.query(`CREATE DATABASE "${name.replace(/"/g, '""')}"`);
  await client.end();

  const apiDir = fileURLToPath(new URL('../apps/api', import.meta.url));
  const env = {
    ...process.env,
    DATABASE_URL: url.toString(),
    DEV_SEED_PASSWORD: E2E_PASSWORD,
    NODE_ENV: 'development',
  };
  execSync('npx prisma migrate deploy', { cwd: apiDir, env, stdio: 'pipe' });

  // Empty everything except reference data, then seed.
  const db = new pg.Client({ connectionString: url.toString() });
  await db.connect();
  const { rows } = await db.query<{ tablename: string }>(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public'
     AND tablename NOT IN ('_prisma_migrations', 'districts')`,
  );
  if (rows.length) {
    await db.query(`TRUNCATE ${rows.map((r) => `"${r.tablename}"`).join(', ')} CASCADE`);
  }
  await db.end();
  execSync('npx prisma db seed', { cwd: apiDir, env, stdio: 'pipe' });
}
