import { validateEnv } from './env';

const REQUIRED = {
  DATABASE_URL: 'postgresql://lawfirm:lawfirm@localhost:5432/lawfirm',
  JWT_ACCESS_SECRET: 'a'.repeat(32),
  JWT_REFRESH_SECRET: 'b'.repeat(32),
  R2_ACCESS_KEY_ID: 'minioadmin',
  R2_SECRET_ACCESS_KEY: 'minioadmin',
  R2_PUBLIC_URL: 'http://localhost:9000/law-firm-documents',
};

describe('validateEnv', () => {
  it('defaults the global rate limit to 120 requests per minute', () => {
    expect(validateEnv(REQUIRED).THROTTLE_LIMIT).toBe(120);
  });

  it('reminders run daily at 08:00 by default and reject a malformed cron expression', () => {
    expect(validateEnv(REQUIRED)).toMatchObject({ REMINDERS_ENABLED: true, REMINDERS_CRON: '0 0 8 * * *' });
    expect(validateEnv({ ...REQUIRED, REMINDERS_ENABLED: 'false', REMINDERS_CRON: '0 30 7 * * 1-5' })).toMatchObject({ REMINDERS_ENABLED: false, REMINDERS_CRON: '0 30 7 * * 1-5' });
    expect(() => validateEnv({ ...REQUIRED, REMINDERS_CRON: 'every morning' })).toThrow(/REMINDERS_CRON/);
  });

  it('lets a rotated refresh token be reused for 30 seconds by default; 0 turns it off, negatives are rejected', () => {
    expect(validateEnv(REQUIRED).REFRESH_REUSE_GRACE_SECONDS).toBe(30);
    expect(validateEnv({ ...REQUIRED, REFRESH_REUSE_GRACE_SECONDS: '0' }).REFRESH_REUSE_GRACE_SECONDS).toBe(0);
    expect(() => validateEnv({ ...REQUIRED, REFRESH_REUSE_GRACE_SECONDS: '-5' })).toThrow(/REFRESH_REUSE_GRACE_SECONDS/);
  });

  it('reads THROTTLE_LIMIT from the environment and rejects values below 1', () => {
    expect(validateEnv({ ...REQUIRED, THROTTLE_LIMIT: '1000' }).THROTTLE_LIMIT).toBe(1000);
    expect(() => validateEnv({ ...REQUIRED, THROTTLE_LIMIT: '0' })).toThrow(/THROTTLE_LIMIT/);
  });

  it('defaults the object store to local MinIO and requires a public URL without a trailing slash', () => {
    expect(validateEnv(REQUIRED)).toMatchObject({
      R2_ENDPOINT: 'http://localhost:9000',
      R2_BUCKET: 'law-firm-documents',
      R2_PUBLIC_URL: 'http://localhost:9000/law-firm-documents',
    });
    expect(validateEnv({ ...REQUIRED, R2_PUBLIC_URL: 'https://cdn.lawfirm.mn/' }).R2_PUBLIC_URL).toBe('https://cdn.lawfirm.mn');
    const { R2_PUBLIC_URL: _omitted, ...withoutPublicUrl } = REQUIRED;
    expect(() => validateEnv(withoutPublicUrl)).toThrow(/R2_PUBLIC_URL/);
    expect(() => validateEnv({ ...REQUIRED, R2_ENDPOINT: 'account.r2.cloudflarestorage.com' })).toThrow(/R2_ENDPOINT/);
  });

  it('keeps the refresh cookie on /auth by default and accepts a proxy prefix', () => {
    expect(validateEnv(REQUIRED)).toMatchObject({ COOKIE_PATH_PREFIX: '', TRUST_PROXY_HOPS: 1 });
    expect(validateEnv({ ...REQUIRED, COOKIE_PATH_PREFIX: '/api/' }).COOKIE_PATH_PREFIX).toBe('/api');
    expect(validateEnv({ ...REQUIRED, TRUST_PROXY_HOPS: '2' }).TRUST_PROXY_HOPS).toBe(2);
    expect(() => validateEnv({ ...REQUIRED, COOKIE_PATH_PREFIX: 'api' })).toThrow(/COOKIE_PATH_PREFIX/);
  });
});
