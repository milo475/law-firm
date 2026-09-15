import { z } from 'zod';

const booleanFromString = z
  .union([z.boolean(), z.enum(['true', 'false', '1', '0'])])
  .transform((value) => value === true || value === 'true' || value === '1');

export const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  JWT_ACCESS_SECRET: z.string().min(16, 'JWT_ACCESS_SECRET must be at least 16 characters'),
  JWT_REFRESH_SECRET: z.string().min(16, 'JWT_REFRESH_SECRET must be at least 16 characters'),
  JWT_ACCESS_TTL: z.string().regex(/^\d+[smhd]$/, 'JWT_ACCESS_TTL must look like 15m / 1h').default('15m'),
  JWT_REFRESH_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(7),

  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  COOKIE_DOMAIN: z
    .string()
    .optional()
    .transform((value) => (value && value.trim().length > 0 ? value.trim() : undefined)),

  MINIO_ENDPOINT: z.string().default('localhost'),
  MINIO_PORT: z.coerce.number().int().default(9000),
  MINIO_USE_SSL: booleanFromString.default(false),
  MINIO_ACCESS_KEY: z.string().min(1),
  MINIO_SECRET_KEY: z.string().min(1),
  MINIO_BUCKET: z.string().min(1).default('law-firm-documents'),
  /** Browser-facing base URL for public objects (post covers). Defaults to http(s)://MINIO_ENDPOINT:MINIO_PORT. */
  MINIO_PUBLIC_URL: z
    .string()
    .optional()
    .transform((value) => (value && value.trim().length > 0 ? value.trim().replace(/\/+$/, '') : undefined)),
});

export type Env = z.infer<typeof EnvSchema>;

/** Used by ConfigModule.forRoot({ validate }) — throws a readable error listing every problem. */
export function validateEnv(config: Record<string, unknown>): Env {
  const result = EnvSchema.safeParse(config);
  if (!result.success) {
    const issues = result.error.issues.map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`);
    throw new Error(`Invalid environment configuration:\n${issues.join('\n')}`);
  }
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
