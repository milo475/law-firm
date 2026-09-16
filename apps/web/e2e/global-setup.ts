import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { databaseNameFromUrl, isTestDatabaseName } from '@law-firm/shared';

/**
 * Drops what earlier runs left behind before the suite starts, so lists stay short and the
 * pagination assertions keep matching. Only test databases are cleaned; with DATABASE_URL unset
 * or pointing at the dev database this is a no-op (the cleanup script refuses it as well).
 */
export default function globalSetup(): void {
  const database = databaseNameFromUrl(process.env.DATABASE_URL);
  if (!isTestDatabaseName(database)) {
    console.log(`[e2e] test-data cleanup skipped — DATABASE_URL points at ${database ?? 'no database'}`);
    return;
  }
  execFileSync('pnpm', ['--filter', '@law-firm/shared', 'db:clean', '--audit', '--sessions'], {
    cwd: path.resolve(__dirname, '../../..'),
    stdio: 'inherit',
  });
}
