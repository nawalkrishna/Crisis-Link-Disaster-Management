import { defineConfig } from 'tsup';

// tsup (esbuild) bundles the API into a single dist/index.js for production.
// The shared workspace package is TypeScript source, so it is bundled in
// rather than left as an external import.
export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node22',
  platform: 'node',
  clean: true,
  sourcemap: true,
  noExternal: ['@crisislink/shared'],
});
