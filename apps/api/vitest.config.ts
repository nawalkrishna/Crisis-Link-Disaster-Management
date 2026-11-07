import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    // Once, before everything: create + migrate the separate test database.
    globalSetup: ['./test/global-setup.ts'],
    // Before each test file: point the app at the test database (before it is imported).
    setupFiles: ['./test/setup-env.ts'],
    // The files share one database, so run them one after another (tests inside a file
    // still run in order). Each file starts from a clean database.
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 60_000,
  },
});
