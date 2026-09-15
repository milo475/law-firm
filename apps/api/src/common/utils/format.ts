const MN_DATE_TIME = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Ulaanbaatar',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

/** 2026-09-20T02:00:00Z → "2026.09.20 10:00" (Ulaanbaatar time), used in notification texts. */
export function formatDateTimeMn(date: Date): string {
  const parts = MN_DATE_TIME.formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? '';
  return `${get('year')}.${get('month')}.${get('day')} ${get('hour')}:${get('minute')}`;
}

/** True when the error is a Prisma unique-constraint violation. */
export function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: unknown }).code === 'P2002';
}

const MN_DATE = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Ulaanbaatar',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** 2026-09-30T00:00:00Z → "2026.09.30" (Ulaanbaatar time). */
export function formatDateMn(date: Date): string {
  const parts = MN_DATE.formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? '';
  return `${get('year')}.${get('month')}.${get('day')}`;
}

/** 1250000 / "1250000.00" → "1 250 000₮" (same format as the web app). */
export function formatMoneyMn(amount: string | number): string {
  const value = typeof amount === 'string' ? Number(amount) : amount;
  return `${value.toLocaleString('en-US', { maximumFractionDigits: 2 }).replace(/,/g, ' ')}₮`;
}
