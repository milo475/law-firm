import { execFileSync } from 'node:child_process';
import path from 'node:path';
import type { FullConfig } from '@playwright/test';
import { config as loadEnv } from 'dotenv';
import { databaseNameFromUrl, isTestDatabaseName } from '@law-firm/shared';

const API_URL = process.env.E2E_API_URL ?? 'http://localhost:4000';
const ROOT = path.resolve(__dirname, '../../..');

/**
 * Keeps a run that can rewrite `screenshots/` off the dev database.
 *
 * The baseline is photographed from the seeded demo data of `lawfirm_test`. The dev database holds
 * the same pages with other publication dates and view counts, so a run against it rewrites every
 * image with unrelated differences and buries the change under review. A run that includes the
 * screenshot spec therefore points DATABASE_URL at the test database itself and stops unless the
 * API it photographs serves that same database — it never silently continues. `pnpm e2e` leaves the
 * spec out and keeps the older behaviour, where a non-test database only skips the cleanup.
 *
 * Afterwards the leftovers of earlier runs are dropped, so lists stay short and the pagination
 * assertions keep matching.
 */
export default async function globalSetup(config: FullConfig): Promise<void> {
  const baseline = writesBaseline(config);
  if (baseline) await requireTestDatabase();

  const database = databaseNameFromUrl(process.env.DATABASE_URL);
  if (!isTestDatabaseName(database)) {
    console.log(`[e2e] test-data cleanup skipped — DATABASE_URL points at ${database ?? 'no database'}`);
    return;
  }
  execFileSync('pnpm', ['--filter', '@law-firm/shared', 'db:clean', '--audit', '--sessions'], {
    cwd: ROOT,
    stdio: 'inherit',
  });
  // A baseline has to be the sample data itself, not the sample data plus what earlier runs left
  // in it: reading a news page counts a view, the settings test rewrites the firm's phone number,
  // the editor tests add users. `db:clean` cannot reach any of that — the seed overwrites all of
  // it, and only here, on a test database, for the run that rewrites the images.
  if (baseline) {
    execFileSync('pnpm', ['--filter', '@law-firm/shared', 'db:seed'], { cwd: ROOT, stdio: 'inherit' });
  }
}

/** Every run except the one that explicitly leaves the screenshot spec out (`pnpm e2e`). */
function writesBaseline(config: FullConfig): boolean {
  const excluded = [config.grepInvert ?? []].flat();
  return !excluded.some((pattern) => pattern.test('screenshots'));
}

/** Points this run at the test database and makes sure the API under the camera is on it too. */
async function requireTestDatabase(): Promise<void> {
  const url = testDatabaseUrl();
  const expected = databaseNameFromUrl(url);
  process.env.DATABASE_URL = url;

  const served = await servedDatabase();
  if (served !== expected) {
    throw new Error(
      `[e2e] refusing to write the screenshot baseline: the API at ${API_URL} serves "${served}", ` +
        `but the baseline is taken from "${expected}". Restart the API with DATABASE_URL pointing ` +
        `at "${expected}" (README §4, "E2E тестийг тусдаа DB дээр ажиллуулах").`,
    );
  }
  console.log(`[e2e] baseline run against "${expected}" — API at ${API_URL} confirmed.`);
}

/**
 * The test database this run must use: TEST_DATABASE_URL when it is set, otherwise the `_test`
 * sibling of DATABASE_URL, so an unprepared shell lands on lawfirm_test instead of lawfirm. The
 * root .env is read the way next.config.ts reads it, for a shell that exported nothing at all;
 * it never overwrites what the shell already set. Connection strings carry a password, so only
 * database names are ever printed.
 */
function testDatabaseUrl(): string {
  loadEnv({ path: path.resolve(ROOT, '.env') });
  const explicit = process.env.TEST_DATABASE_URL?.trim();
  const configured = explicit || process.env.DATABASE_URL;
  if (!configured) {
    throw new Error('[e2e] set TEST_DATABASE_URL (or DATABASE_URL) before a run that writes the screenshot baseline.');
  }
  const name = databaseNameFromUrl(configured);
  if (!name) {
    throw new Error(`[e2e] ${explicit ? 'TEST_DATABASE_URL' : 'DATABASE_URL'} has no database name.`);
  }
  if (isTestDatabaseName(name)) return configured;
  if (explicit) {
    throw new Error(`[e2e] TEST_DATABASE_URL names "${name}", which is not a test database (test, *_test).`);
  }
  const derived = new URL(configured);
  derived.pathname = `/${name}_test`;
  console.log(`[e2e] DATABASE_URL names "${name}"; the baseline run uses "${name}_test" instead.`);
  return derived.toString();
}

/** The database the API reports on /health — the only way to know what the pages will show. */
async function servedDatabase(): Promise<string> {
  let body: { databaseName?: unknown };
  try {
    body = (await (await fetch(`${API_URL}/health`)).json()) as { databaseName?: unknown };
  } catch (error) {
    throw new Error(`[e2e] the API at ${API_URL} did not answer /health (${(error as Error).message}); start it before taking screenshots.`);
  }
  if (typeof body.databaseName !== 'string') {
    throw new Error(
      `[e2e] the API at ${API_URL} did not name its database. /health leaves the name out when ` +
        'NODE_ENV=production, and a baseline run that cannot tell which database it photographs ' +
        'is exactly what this check exists to stop. Start the API with NODE_ENV=development.',
    );
  }
  return body.databaseName;
}
