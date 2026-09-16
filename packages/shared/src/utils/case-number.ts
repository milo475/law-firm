export const CASE_NUMBER_PREFIX = 'LF';
export const CASE_NUMBER_REGEX = /^LF-\d{4}-\d{4}$/;
export const INVOICE_NUMBER_PREFIX = 'INV';

/** Formats `PREFIX-YYYY-NNNN`, e.g. `LF-2026-0001`. */
export function formatSequenceNumber(prefix: string, year: number, sequence: number): string {
  return `${prefix}-${year}-${String(sequence).padStart(4, '0')}`;
}

/** Parses `PREFIX-YYYY-NNNN` into its parts; returns null when the format does not match. */
export function parseSequenceNumber(value: string, prefix: string): { year: number; sequence: number } | null {
  const match = new RegExp(`^${prefix}-(\\d{4})-(\\d{4,})$`).exec(value);
  if (!match) return null;
  return { year: Number(match[1]), sequence: Number(match[2]) };
}

/**
 * Next number in the yearly sequence. `lastNumber` is the highest existing number for the
 * same prefix (or null); a number from a previous year restarts the sequence at 0001.
 */
export function nextSequenceNumber(prefix: string, year: number, lastNumber: string | null): string {
  const last = lastNumber ? parseSequenceNumber(lastNumber, prefix) : null;
  const sequence = last && last.year === year ? last.sequence + 1 : 1;
  return formatSequenceNumber(prefix, year, sequence);
}

/** Formats a case number like `LF-2026-0001`. */
export function formatCaseNumber(year: number, sequence: number): string {
  return formatSequenceNumber(CASE_NUMBER_PREFIX, year, sequence);
}


