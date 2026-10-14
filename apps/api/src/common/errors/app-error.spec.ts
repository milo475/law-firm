import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { ERROR_CODES, isErrorCode } from '@law-firm/shared';
import { err } from './app-error';

const SRC = path.resolve(__dirname, '../..');

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) return sources(full);
    return full.endsWith('.ts') && !full.endsWith('.spec.ts') ? [full] : [];
  });
}

const code = sources(SRC).map((file) => readFileSync(file, 'utf8')).join('\n');

describe('error codes', () => {
  it('has no duplicates', () => {
    expect(new Set(ERROR_CODES).size).toBe(ERROR_CODES.length);
  });

  it('names every code <module>.<reason>', () => {
    for (const value of ERROR_CODES) expect(value).toMatch(/^[a-z][a-zA-Z]*\.[a-z][a-zA-Z]*$/);
  });

  /** A code nobody throws is a translation the firm paid for and a reader will never see. */
  it('uses every declared code somewhere in the API', () => {
    const unused = ERROR_CODES.filter((value) => !code.includes(`'${value}'`));
    expect(unused).toEqual([]);
  });

  it('throws only declared codes', () => {
    const thrown = [...code.matchAll(/err\(\s*'([^']+)'/g)].map((match) => match[1]);
    expect(thrown.length).toBeGreaterThan(100);
    expect(thrown.filter((value) => !isErrorCode(value))).toEqual([]);
  });

  it('carries details only when there are values to fill in', () => {
    expect(err('case.notFound', 'Хэрэг олдсонгүй')).toEqual({ code: 'case.notFound', message: 'Хэрэг олдсонгүй' });
    expect(err('documentRequest.tooManyFiles', 'x', { max: 20 })).toEqual({
      code: 'documentRequest.tooManyFiles',
      message: 'x',
      details: { max: 20 },
    });
  });
});
