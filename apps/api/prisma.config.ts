import 'dotenv/config';
import { defineConfig } from 'prisma/config';

// Prisma 7 reads its settings (including the database URL) from this file.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    // `prisma generate` doesn't need a database, so don't crash when the URL is missing (e.g. in CI).
    url: process.env.DATABASE_URL ?? '',
  },
});
