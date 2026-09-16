import { assertTestDatabase, databaseNameFromUrl, isTestDatabaseName, isTestEmail, isTestLabel } from './test-data';

const DEV_URL = 'postgresql://lawfirm:lawfirm@localhost:5432/lawfirm?schema=public';
const TEST_URL = 'postgresql://lawfirm:lawfirm@localhost:5432/lawfirm_test?schema=public';

describe('isTestLabel', () => {
  it('matches the e2e prefix only at the start', () => {
    expect(isTestLabel('E2E багийн хэрэг 7f3a')).toBe(true);
    expect(isTestLabel('Хуучин E2E хэрэг')).toBe(false);
    expect(isTestLabel('Түрээсийн гэрээний маргаан')).toBe(false);
    expect(isTestLabel(null)).toBe(false);
    expect(isTestLabel(undefined)).toBe(false);
  });

  it('accepts extra prefixes for legacy leftovers', () => {
    expect(isTestLabel('Smoke: цалингийн маргаан', ['E2E ', 'Smoke'])).toBe(true);
    expect(isTestLabel('Smoke: цалингийн маргаан')).toBe(false);
  });
});

describe('isTestEmail', () => {
  it('matches the e2e prefix regardless of case', () => {
    expect(isTestEmail('e2e.perf.7f3a@lawfirm.mn')).toBe(true);
    expect(isTestEmail('E2E.perf.7f3a@lawfirm.mn')).toBe(true);
    expect(isTestEmail('client1@example.mn')).toBe(false);
    expect(isTestEmail(null)).toBe(false);
  });
});

describe('databaseNameFromUrl', () => {
  it('reads the database name and ignores query parameters', () => {
    expect(databaseNameFromUrl(TEST_URL)).toBe('lawfirm_test');
    expect(databaseNameFromUrl('postgresql://localhost:5432/lawfirm')).toBe('lawfirm');
  });

  it('returns null when there is no name to read', () => {
    expect(databaseNameFromUrl('postgresql://localhost:5432/')).toBeNull();
    expect(databaseNameFromUrl('not a url')).toBeNull();
    expect(databaseNameFromUrl(undefined)).toBeNull();
  });
});

describe('isTestDatabaseName', () => {
  it('accepts only test databases', () => {
    expect(isTestDatabaseName('lawfirm_test')).toBe(true);
    expect(isTestDatabaseName('test')).toBe(true);
    expect(isTestDatabaseName('lawfirm')).toBe(false);
    expect(isTestDatabaseName('protest')).toBe(false);
    expect(isTestDatabaseName('test_lawfirm')).toBe(false);
    expect(isTestDatabaseName(null)).toBe(false);
  });
});

describe('assertTestDatabase', () => {
  it('returns the name of a test database', () => {
    expect(assertTestDatabase(TEST_URL)).toBe('lawfirm_test');
  });

  it('refuses the dev database', () => {
    expect(() => assertTestDatabase(DEV_URL)).toThrow(/Refusing to clean "lawfirm"/);
  });

  it('refuses a missing connection string', () => {
    expect(() => assertTestDatabase(undefined)).toThrow(/DATABASE_URL/);
  });

  it('only accepts --force when it repeats the database name', () => {
    expect(assertTestDatabase(DEV_URL, 'lawfirm')).toBe('lawfirm');
    expect(() => assertTestDatabase(DEV_URL, 'lawfirm_test')).toThrow(/Refusing to clean/);
    expect(() => assertTestDatabase(DEV_URL, '')).toThrow(/Refusing to clean/);
  });
});
