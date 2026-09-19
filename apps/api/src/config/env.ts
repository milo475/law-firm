import { z } from 'zod';

const booleanFromString = z
  .union([z.boolean(), z.enum(['true', 'false', '1', '0'])])
  .transform((value) => value === true || value === 'true' || value === '1');

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  /** Global rate limit: requests per minute per client IP. Raise it only for e2e or load runs from one machine. */
  THROTTLE_LIMIT: z.coerce.number().int().min(1).default(120),
  /** Daily reminders for overdue / due-soon tasks, invoices and document requests. Never scheduled when NODE_ENV=test. */
  REMINDERS_ENABLED: booleanFromString.default(true),
  /** Cron expression in server local time (seconds minutes hours day month weekday); default every day at 08:00. */
  REMINDERS_CRON: z
    .string()
    .trim()
    .regex(/^(\S+\s+){4,5}\S+$/, 'REMINDERS_CRON must be a 5 or 6 field cron expression')
    .default('0 0 8 * * *'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  JWT_ACCESS_SECRET: z.string().min(16, 'JWT_ACCESS_SECRET must be at least 16 characters'),
  JWT_REFRESH_SECRET: z.string().min(16, 'JWT_REFRESH_SECRET must be at least 16 characters'),
  JWT_ACCESS_TTL: z.string().regex(/^\d+[smhd]$/, 'JWT_ACCESS_TTL must look like 15m / 1h').default('15m'),
  JWT_REFRESH_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(7),
  /** Seconds a rotated refresh token may be presented again by a concurrent request (another tab) without revoking every session; 0 = off. */
  REFRESH_REUSE_GRACE_SECONDS: z.coerce.number().int().min(0).max(300).default(30),

  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  COOKIE_DOMAIN: z
    .string()
    .optional()
    .transform((value) => (value && value.trim().length > 0 ? value.trim() : undefined)),

  /** S3 endpoint: https://<account>.r2.cloudflarestorage.com on R2, http://localhost:9000 with local MinIO. */
  R2_ENDPOINT: z.string().url('R2_ENDPOINT must be a URL').default('http://localhost:9000'),
  R2_ACCESS_KEY_ID: z.string().min(1),
  R2_SECRET_ACCESS_KEY: z.string().min(1),
  /** Private bucket: client documents and task attachments; only ever read through presigned URLs. */
  R2_BUCKET: z.string().min(1).default('law-firm-documents'),
  /**
   * Public bucket: post covers and lawyer photos, the one R2_PUBLIC_URL points at. Optional locally
   * (a single MinIO bucket with a `public/` prefix), required in production so client documents can
   * never sit in a bucket that has r2.dev or a public domain switched on.
   */
  R2_PUBLIC_BUCKET: z.string().default('').transform((value) => value.trim()),
  /**
   * Browser-facing base URL of the bucket root for public objects (post covers):
   * the R2 public bucket URL / custom domain, or http://localhost:9000/<bucket> with MinIO.
   */
  R2_PUBLIC_URL: z
    .string()
    .min(1, 'R2_PUBLIC_URL is required')
    .transform((value) => value.trim().replace(/\/+$/, '')),

  /**
   * Path prefix the browser sees in front of the API. Empty when the API is called directly;
   * `/api` when the web app proxies it same-origin (Railway), so the refresh cookie is scoped
   * to `/api/auth` instead of `/auth`.
   */
  COOKIE_PATH_PREFIX: z
    .string()
    .default('')
    .transform((value) => value.trim().replace(/\/+$/, ''))
    .refine((value) => value === '' || value.startsWith('/'), 'COOKIE_PATH_PREFIX must start with /'),
  /** Sentry DSN; empty turns error reporting off entirely (local development, tests). */
  SENTRY_DSN: z.string().default('').transform((value) => value.trim()),
  /** Release name for Sentry; Railway injects the commit SHA. */
  RAILWAY_GIT_COMMIT_SHA: z.string().default('').transform((value) => value.trim()),

  /** Proxy hops in front of the API (Railway edge → web rewrite → api = 2). Only applied when NODE_ENV=production. */
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(10).default(1),
});

export type Env = z.infer<typeof EnvSchema>;

/** Anyone who can read .env.example could forge tokens signed with these. */
const PLACEHOLDER_SECRETS = new Set([
  'change-me-access-secret-at-least-32-chars',
  'change-me-refresh-secret-at-least-32-chars',
  'secret',
  'changeme',
]);

/**
 * Extra rules that only apply to a real deployment. Keeping them out of the schema lets the
 * dev and test setups stay short while a production boot refuses obviously unsafe values.
 */
function assertProductionSafety(env: Env): void {
  if (env.NODE_ENV !== 'production') return;
  const problems: string[] = [];
  for (const [name, secret] of [
    ['JWT_ACCESS_SECRET', env.JWT_ACCESS_SECRET],
    ['JWT_REFRESH_SECRET', env.JWT_REFRESH_SECRET],
  ] as const) {
    if (PLACEHOLDER_SECRETS.has(secret)) problems.push(`  - ${name}: still the example value from .env.example`);
    else if (secret.length < 32) problems.push(`  - ${name}: must be at least 32 characters in production`);
  }
  if (env.JWT_ACCESS_SECRET === env.JWT_REFRESH_SECRET) {
    problems.push('  - JWT_ACCESS_SECRET / JWT_REFRESH_SECRET: must differ, or a stolen access token can be replayed as a refresh token');
  }
  if (env.CORS_ORIGIN.split(',').some((origin) => origin.trim() === '*')) {
    problems.push('  - CORS_ORIGIN: "*" cannot be combined with cookie credentials');
  }
  if (!env.R2_PUBLIC_BUCKET) {
    problems.push('  - R2_PUBLIC_BUCKET: required in production, so the document bucket can stay private');
  }
  if (env.R2_PUBLIC_BUCKET === env.R2_BUCKET) {
    problems.push('  - R2_PUBLIC_BUCKET: must differ from R2_BUCKET — the public bucket is world-readable');
  }
  if (problems.length > 0) {
    throw new Error(`Unsafe production environment:\n${problems.join('\n')}`);
  }
}

/** Used by ConfigModule.forRoot({ validate }) — throws a readable error listing every problem. */
export function validateEnv(config: Record<string, unknown>): Env {
  const result = EnvSchema.safeParse(config);
  if (!result.success) {
    const issues = result.error.issues.map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`);
    throw new Error(`Invalid environment configuration:\n${issues.join('\n')}`);
  }
  assertProductionSafety(result.data);
  return result.data;
}

/** Parses a duration string such as `15m`, `1h`, `7d` into milliseconds. */
export function durationToMs(value: string): number {
  const match = /^(\d+)([smhd])$/.exec(value);
  if (!match) throw new Error(`Invalid duration: ${value}`);
  const amount = Number(match[1]);
  const unit = match[2];
  const multipliers: Record<string, number> = { s: 1_000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return amount * multipliers[unit];
}
