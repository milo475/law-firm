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
