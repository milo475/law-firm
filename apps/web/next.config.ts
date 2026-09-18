import createNextIntlPlugin from 'next-intl/plugin';
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

/**
 * Hosts the image optimizer may fetch from. A wildcard here would turn /_next/image into an open
 * proxy for any https URL, so only the bucket that actually serves avatars and post covers is listed
 * (plus localhost for the MinIO setup used in development).
 */
function imageHosts(): { protocol: 'http' | 'https'; hostname: string }[] {
  const hosts: { protocol: 'http' | 'https'; hostname: string }[] = [
    { protocol: 'http', hostname: 'localhost' },
    { protocol: 'http', hostname: '127.0.0.1' },
  ];
  const publicUrl = process.env.R2_PUBLIC_URL?.trim();
  if (publicUrl) {
    try {
      const { protocol, hostname } = new URL(publicUrl);
      hosts.push({ protocol: protocol === 'http:' ? 'http' : 'https', hostname });
    } catch {
      // A malformed R2_PUBLIC_URL just means no remote images; the build should not fail over it.
    }
  }
  return hosts;
}

/**
 * Headers for every response. The API sets its own through helmet; these cover the pages themselves.
 * No CSP yet: Next's inline bootstrap scripts need a nonce-based policy, which needs middleware
 * changes — tracked separately rather than shipped as a policy that would have to allow 'unsafe-inline'.
 */
const SECURITY_HEADERS = [
  // The portal must never be framed — clickjacking a client's case data or the pay button.
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), interest-cohort=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Lockfiles outside the repo (e.g. ~/package-lock.json) otherwise make Next guess the wrong root.
  outputFileTracingRoot: path.resolve(__dirname, '../..'),
  env: {
    NEXT_PUBLIC_API_URL: publicApiUrl,
  },
  images: {
    remotePatterns: imageHosts(),
  },
  async headers() {
    return [
      { source: '/:path*', headers: SECURITY_HEADERS },
      // Signed-in surfaces should never sit in a shared cache — in every language prefix.
      ...['/portal/:path*', '/admin/:path*', '/:locale(en|zh)/portal/:path*', '/:locale(en|zh)/admin/:path*'].map((source) => ({
        source,
        headers: [{ key: 'Cache-Control', value: 'private, no-store' }],
      })),
    ];
  },
  // Returned as an array, so these run *after* the app's own routes: /api/revalidate stays a
  // Next route handler and only the remaining /api/* paths reach the NestJS API.
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${serverApiUrl}/:path*` }];
  },
};

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

export default withNextIntl(nextConfig);
