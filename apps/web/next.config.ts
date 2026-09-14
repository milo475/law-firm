import type { NextConfig } from 'next';
import path from 'node:path';
import { config as loadEnv } from 'dotenv';

// Next.js only reads apps/web/.env*, so pull in the monorepo root .env as well.
loadEnv({ path: [path.resolve(__dirname, '../../.env'), path.resolve(__dirname, '.env')] });

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_API_URL: apiUrl,
  },
  images: {
    remotePatterns: [{ protocol: 'http', hostname: 'localhost' }, { protocol: 'https', hostname: '**' }],
  },
};

export default nextConfig;
