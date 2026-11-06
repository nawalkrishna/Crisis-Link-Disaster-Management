/**
 * All configuration comes from environment variables (the "12-factor app" rule):
 * the same code runs locally, in tests and in production; only the env changes.
 * Phase 1 will validate these with Zod so a typo fails fast at startup.
 */
const port = Number(process.env.PORT ?? 4000);
if (!Number.isInteger(port) || port <= 0) {
  throw new Error(`Invalid PORT: ${process.env.PORT}`);
}

export const config = {
  port,
  nodeEnv: process.env.NODE_ENV ?? 'development',
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
} as const;
