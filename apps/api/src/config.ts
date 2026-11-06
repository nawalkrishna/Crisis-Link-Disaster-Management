import { z } from 'zod';

/**
 * All configuration comes from environment variables (the "12-factor app" rule):
 * the same code runs locally, in tests and in production; only the env changes.
 *
 * We validate them with Zod at startup so a missing or mistyped variable fails
 * immediately with a clear message, instead of as a confusing error later.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z
    .string({ error: 'DATABASE_URL is required - copy apps/api/.env.example to apps/api/.env' })
    .startsWith('postgres', 'DATABASE_URL must be a postgres:// or postgresql:// URL'),
  CORS_ORIGINS: z.string().default('http://localhost:5173'),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment configuration:');
  for (const issue of parsed.error.issues) {
    console.error(`  ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

const env = parsed.data;

export const config = {
  nodeEnv: env.NODE_ENV,
  port: env.PORT,
  databaseUrl: env.DATABASE_URL,
  corsOrigins: env.CORS_ORIGINS.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
} as const;
