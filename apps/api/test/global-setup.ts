import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { testDatabaseUrl } from './test-db';

/** Runs once before all test files: make sure the test database exists and is migrated. */
export default async function setup() {
  const url = new URL(testDatabaseUrl());
  const name = decodeURIComponent(url.pathname.slice(1));

  // Connect to the server's default "postgres" database to create ours if it's missing.
  const admin = new URL(url);
  admin.pathname = '/postgres';
  const client = new pg.Client({ connectionString: admin.toString() });
  await client.connect();
  const { rowCount } = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [name]);
  if (!rowCount) await client.query(`CREATE DATABASE "${name.replace(/"/g, '""')}"`);
  await client.end();

  // Apply the same committed migrations production uses (never `migrate dev` here).
  execSync('npx prisma migrate deploy', {
    cwd: fileURLToPath(new URL('..', import.meta.url)),
    env: { ...process.env, DATABASE_URL: url.toString() },
    stdio: 'pipe',
  });
}
