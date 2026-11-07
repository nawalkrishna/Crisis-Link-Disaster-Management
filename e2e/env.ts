import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parse } from 'dotenv';

/** Settings shared by playwright.config.ts and the global setup. */
export const API_PORT = 4100;
export const WEB_PORT = 4174;
export const WEB_URL = `http://localhost:${WEB_PORT}`;
/** Password of the seeded sample accounts in the e2e database (a throwaway test value). */
export const E2E_PASSWORD = 'e2e-only-password';

/** Its own database (dev name + "_e2e"), so e2e runs never touch dev or unit-test data. */
export function e2eDatabaseUrl() {
  if (process.env.E2E_DATABASE_URL) return process.env.E2E_DATABASE_URL;
  const envFile = fileURLToPath(new URL('../apps/api/.env', import.meta.url));
  const devUrl =
    process.env.DATABASE_URL ??
    (existsSync(envFile) ? parse(readFileSync(envFile)).DATABASE_URL : undefined);
  if (!devUrl) throw new Error('Set E2E_DATABASE_URL or DATABASE_URL in apps/api/.env');
  const url = new URL(devUrl);
  url.pathname = `/${url.pathname.slice(1).replace(/_(test|e2e)$/, '')}_e2e`;
  return url.toString();
}
