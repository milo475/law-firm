import type { NextConfig } from 'next';
import path from 'node:path';
import { config as loadEnv } from 'dotenv';

// Next.js only reads apps/web/.env*, so pull in the monorepo root .env as well.
loadEnv({ path: [path.resolve(__dirname, '../../.env'), path.resolve(__dirname, '.env')] });

/**
 * What the browser calls. `/api` keeps every request same-origin, which is what makes the
 * session cookies work when the web app and the API live on two different hosts
 * (*.up.railway.app is a public suffix, so a cross-host Lax cookie would never be sent).
 */
const publicApiUrl = process.env.NEXT_PUBLIC_API_URL ?? '/api';
/** Where that proxy forwards to — reachable from the server only (Railway private network). */
const serverApiUrl = (process.env.API_URL ?? 'http://localhost:4000').replace(/\/+$/, '');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_API_URL: publicApiUrl,
  },
  images: {
    remotePatterns: [{ protocol: 'http', hostname: 'localhost' }, { protocol: 'https', hostname: '**' }],
  },
  // Returned as an array, so these run *after* the app's own routes: /api/revalidate stays a
  // Next route handler and only the remaining /api/* paths reach the NestJS API.
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${serverApiUrl}/:path*` }];
  },
};

export default nextConfig;
