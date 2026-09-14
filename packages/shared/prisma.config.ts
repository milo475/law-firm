import path from 'node:path';
import { config as loadEnv } from 'dotenv';
import { defineConfig, env } from 'prisma/config';

// Prisma 7 no longer auto-loads .env files. Load the monorepo root .env first,
// then a package-local .env (if any) as an override.
loadEnv({ path: [path.resolve(__dirname, '../../.env'), path.resolve(__dirname, '.env')] });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
