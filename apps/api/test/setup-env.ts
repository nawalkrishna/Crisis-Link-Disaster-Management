import { testDatabaseUrl } from './test-db';

// Runs before each test file, BEFORE the app's modules are imported (config reads env once).
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = testDatabaseUrl();
process.env.CORS_ORIGINS = 'http://localhost:5173';
process.env.PUBLIC_WEB_URL = 'http://localhost:5173';
process.env.SMS_PROVIDER = 'memory'; // tests read "sent" SMS from memory
process.env.LOG_LEVEL ??= 'silent';
delete process.env.REDIS_URL; // single-server mode unless a test opts in (redis.test.ts)
delete process.env.METRICS_TOKEN;
