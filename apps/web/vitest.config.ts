import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

/**
 * Unit/component tests run in Node with JSDOM (a simulated browser DOM) - fast, no real
 * browser. Whole-app tests in a real browser are in /e2e (Playwright).
 */
export default defineConfig({
  plugins: [react()],
  define: { __APP_VERSION__: JSON.stringify('test') },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['./src/test-setup.ts'],
  },
});
