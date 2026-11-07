import { z } from 'zod';

/**
 * All configuration comes from environment variables (the "12-factor app" rule):
 * the same code runs locally, in tests and in production; only the env changes.
 *
 * We validate them with Zod at startup so a missing or mistyped variable fails
 * immediately with a clear message, instead of as a confusing error later.
 */
const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(4000),
    DATABASE_URL: z
      .string({ error: 'DATABASE_URL is required - copy apps/api/.env.example to apps/api/.env' })
      .startsWith('postgres', 'DATABASE_URL must be a postgres:// or postgresql:// URL'),
    CORS_ORIGINS: z.string().default('http://localhost:5173'),
    SESSION_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(7),
    /** Number of reverse proxies in front of the API (e.g. 1 on Render/Railway), so req.ip is the real client IP. */
    TRUST_PROXY: z.coerce.number().int().min(0).default(0),
    /** Password for the sample users created by `npm run db:seed` (development only). */
    DEV_SEED_PASSWORD: z.string().min(10).optional(),
    /** Where the web app lives - used for links inside SMS messages. */
    PUBLIC_WEB_URL: z.url().default('http://localhost:5173'),
    /**
     * How SMS are sent. `console` prints them in the API terminal (development - no account or
     * cost needed). `twilio` sends real messages and needs the three TWILIO_* variables.
     */
    SMS_PROVIDER: z.enum(['console', 'twilio']).default('console'),
    TWILIO_ACCOUNT_SID: z.string().optional(),
    TWILIO_AUTH_TOKEN: z.string().optional(),
    TWILIO_FROM: z.string().optional(),
  })
  .refine(
    (env) =>
      env.SMS_PROVIDER !== 'twilio' ||
      (env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_FROM),
    {
      path: ['SMS_PROVIDER'],
      message: 'SMS_PROVIDER=twilio needs TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_FROM',
    },
  );

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
  sessionTtlMs: env.SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
  trustProxy: env.TRUST_PROXY,
  devSeedPassword: env.DEV_SEED_PASSWORD,
  publicWebUrl: env.PUBLIC_WEB_URL.replace(/\/$/, ''),
  sms: {
    provider: env.SMS_PROVIDER,
    twilio: {
      accountSid: env.TWILIO_ACCOUNT_SID ?? '',
      authToken: env.TWILIO_AUTH_TOKEN ?? '',
      from: env.TWILIO_FROM ?? '',
    },
  },
  isProduction: env.NODE_ENV === 'production',
} as const;
