import { defineConfig, devices } from '@playwright/test';
import { API_PORT, WEB_PORT, WEB_URL, e2eDatabaseUrl } from './e2e/env';

/**
 * END-TO-END TESTS: a real browser clicks through the real app (production build + service
 * worker) talking to a real API and database - the closest thing to a user, and the only
 * kind of test that catches "every part works, but they don't work together".
 *
 * `npm run test:e2e` starts everything itself on separate ports with a separate database, so it
 * can run next to `npm run dev`.
 */
const CI = !!process.env.CI;

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  // The tests share one database and some change it: run them one at a time.
  workers: 1,
  fullyParallel: false,
  retries: CI ? 1 : 0,
  forbidOnly: CI, // a forgotten test.only() must not silently skip the rest in CI
  reporter: CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: WEB_URL,
    trace: 'retain-on-failure', // a step-by-step recording to debug failures
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      // Locally: your installed Chrome (no browser download). CI: Playwright's own Chromium.
      use: { ...devices['Desktop Chrome'], ...(CI ? {} : { channel: 'chrome' }) },
    },
  ],
  webServer: [
    {
      name: 'api',
      command: 'node --import tsx src/index.ts',
      cwd: './apps/api',
      url: `http://localhost:${API_PORT}/api/health/live`,
      reuseExistingServer: false,
      timeout: 60_000,
      env: {
        NODE_ENV: 'development',
        PORT: String(API_PORT),
        DATABASE_URL: e2eDatabaseUrl(),
        CORS_ORIGINS: WEB_URL,
        PUBLIC_WEB_URL: WEB_URL,
        SMS_PROVIDER: 'memory',
        LOG_LEVEL: 'warn',
      },
    },
    {
      name: 'web',
      command: `npm run build -w @crisislink/web && npm run preview -w @crisislink/web -- --port ${WEB_PORT} --strictPort`,
      url: WEB_URL,
      reuseExistingServer: false,
      timeout: 180_000,
      env: { API_PROXY_TARGET: `http://localhost:${API_PORT}` },
    },
  ],
});
