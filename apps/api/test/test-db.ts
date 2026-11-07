import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parse } from 'dotenv';

/**
 * Tests NEVER touch your development data: they use a separate database, by default the dev
 * database's name + "_test" (crisislink -> crisislink_test) on the same server.
 * Override with TEST_DATABASE_URL (CI does).
 */
export function testDatabaseUrl() {
  if (process.env.TEST_DATABASE_URL) return process.env.TEST_DATABASE_URL;
  const envFile = fileURLToPath(new URL('../.env', import.meta.url));
  const devUrl =
    process.env.DATABASE_URL ??
    (existsSync(envFile) ? parse(readFileSync(envFile)).DATABASE_URL : undefined);
  if (!devUrl) {
    throw new Error('Set TEST_DATABASE_URL, or DATABASE_URL in apps/api/.env, to run the tests');
  }
  const url = new URL(devUrl);
  const name = url.pathname.slice(1);
  url.pathname = `/${name.endsWith('_test') ? name : `${name}_test`}`;
  return url.toString();
}
