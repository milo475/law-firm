export const CASE_NUMBER_PREFIX = 'LF';
export const CASE_NUMBER_REGEX = /^LF-\d{4}-\d{4}$/;

/** Formats a case number like `LF-2026-0001`. */
export function formatCaseNumber(year: number, sequence: number): string {
  return `${CASE_NUMBER_PREFIX}-${year}-${String(sequence).padStart(4, '0')}`;
}

/** Parses `LF-2026-0001` into its parts; returns null when the format is invalid. */
export function parseCaseNumber(value: string): { year: number; sequence: number } | null {
  if (!CASE_NUMBER_REGEX.test(value)) return null;
  const [, year, sequence] = value.split('-');
  return { year: Number(year), sequence: Number(sequence) };
}
