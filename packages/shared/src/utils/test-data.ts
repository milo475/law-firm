/**
 * Conventions that keep test rows apart from the demo rows `prisma/seed.ts` writes.
 *
 * Every row an e2e test creates is labelled with `E2E ` and every user it registers gets an
 * `e2e.` e-mail, so `pnpm db:clean` can drop the leftovers of a test run without touching the
 * demo data. Manual smoke testing should follow the same convention.
 */
export const TEST_LABEL_PREFIX = 'E2E ';
export const TEST_EMAIL_PREFIX = 'e2e.';

/** True when a title/description/body was written by a test run. */
export function isTestLabel(value: string | null | undefined, prefixes: readonly string[] = [TEST_LABEL_PREFIX]): boolean {
  return typeof value === 'string' && prefixes.some((prefix) => value.startsWith(prefix));
}

/** True when a user was registered by a test run. */
export function isTestEmail(email: string | null | undefined, prefixes: readonly string[] = [TEST_EMAIL_PREFIX]): boolean {
  return typeof email === 'string' && prefixes.some((prefix) => email.toLowerCase().startsWith(prefix.toLowerCase()));
}

/** Database name of a PostgreSQL connection string, or null when it cannot be read. */
export function databaseNameFromUrl(url: string | undefined | null): string | null {
  if (!url) return null;
  try {
    const name = decodeURIComponent(new URL(url).pathname.replace(/^\//, ''));
    return name.length > 0 ? name : null;
  } catch {
    return null;
  }
}

/** Databases the cleanup script may touch without an explicit override: `test` and `*_test`. */
export function isTestDatabaseName(name: string | null | undefined): boolean {
  return typeof name === 'string' && /(^|_)test$/.test(name);
}

/**
 * Guards destructive maintenance scripts. Returns the database name when the connection string
 * points at a test database, or when `force` repeats that database's exact name.
 */
export function assertTestDatabase(url: string | undefined | null, force?: string | null): string {
  const name = databaseNameFromUrl(url);
  if (!name) throw new Error('DATABASE_URL is not set or has no database name');
  if (isTestDatabaseName(name)) return name;
  if (force && force === name) return name;
  throw new Error(
    `Refusing to clean "${name}": only test databases (test, *_test) are cleaned by default. ` +
      `Pass --force ${name} if you really mean this database.`,
  );
}
