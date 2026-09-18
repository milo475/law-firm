import { BCP47, type Locale } from '@/i18n/routing';

/**
 * Dates and numbers follow the reader's language (mn: 2026.09.18, en: 09/18/2026, zh: 2026/09/18);
 * money keeps the ₮ symbol in every language and only the grouping changes.
 */
export function formatDate(value: string | Date | null | undefined, locale: Locale = 'mn', withTime = false): string {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(BCP47[locale], {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    ...(withTime ? { hour: '2-digit', minute: '2-digit', hour12: false } : {}),
  }).format(date);
}

/** The long form used in article headers: "2026 оны есдүгээр сарын 18" / "September 18, 2026". */
export function formatDateLong(value: string | Date | null | undefined, locale: Locale = 'mn'): string {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(BCP47[locale], { year: 'numeric', month: 'long', day: 'numeric' }).format(date);
}

/** "2026 оны есдүгээр сарын 14, Даваа гараг" / "Monday, September 14, 2026" — the portal's date line. */
export function formatDateWithWeekday(value: string | Date, locale: Locale = 'mn'): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(BCP47[locale], { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }).format(date);
}

/** "2 цагийн өмнө" / "2 hours ago" / "2小时前" — falls back to the plain date beyond a month. */
export function formatTimeAgo(value: string | Date, locale: Locale = 'mn'): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '—';
  const minutes = Math.round((date.getTime() - Date.now()) / 60_000);
  const relative = new Intl.RelativeTimeFormat(BCP47[locale], { numeric: 'auto' });
  if (Math.abs(minutes) < 1) return relative.format(0, 'minute');
  if (Math.abs(minutes) < 60) return relative.format(minutes, 'minute');
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return relative.format(hours, 'hour');
  const days = Math.round(hours / 24);
  if (Math.abs(days) < 30) return relative.format(days, 'day');
  return formatDate(date, locale);
}

/** "9 сар" / "Sep" / "9月" — the small month label on the portal's event tiles. */
export function formatMonthShort(value: string | Date, locale: Locale = 'mn'): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(BCP47[locale], { month: locale === 'en' ? 'short' : 'numeric' }).format(date) + (locale === 'mn' ? ' сар' : '');
}

/** 1500000 → "1 500 000₮" (space thousands separator, as in the Figma portal frames). ₮ in every language. */
export function formatMoney(value: string | number, locale: Locale = 'mn'): string {
  const amount = typeof value === 'string' ? Number(value) : value;
  if (Number.isNaN(amount)) return '—';
  const grouped = new Intl.NumberFormat(BCP47[locale], { maximumFractionDigits: 2 }).format(amount);
  // The Figma frames group with spaces; other languages keep their own separator.
  return `${locale === 'mn' ? grouped.replace(/,/g, ' ') : grouped}₮`;
}

/** "70001199" → "+976 7000-1199" (the firm's contact format); anything else is shown as stored. */
export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').replace(/^976(?=\d{8}$)/, '');
  return digits.length === 8 ? `+976 ${digits.slice(0, 4)}-${digits.slice(4)}` : value;
}

/** tel: link for a Mongolian number, with the country code. */
export function phoneHref(value: string): string {
  return `tel:+976${value.replace(/\D/g, '').replace(/^976(?=\d{8}$)/, '')}`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const CATEGORY_LABELS: Record<string, string> = {
  NEWS: 'Мэдээ',
  ADVICE: 'Зөвлөгөө',
  LEGAL_UPDATE: 'Хууль тогтоомжийн шинэчлэл',
};

export const CASE_STATUS_LABELS: Record<string, string> = {
  NEW: 'Шинэ',
  IN_PROGRESS: 'Явагдаж буй',
  WAITING: 'Хүлээгдэж буй',
  CLOSED: 'Хаагдсан',
};

export const CASE_TYPE_LABELS: Record<string, string> = {
  CIVIL: 'Иргэний хэрэг',
  CRIMINAL: 'Эрүүгийн хэрэг',
  FAMILY: 'Гэр бүлийн хэрэг',
  BUSINESS: 'Бизнесийн маргаан',
  LABOR: 'Хөдөлмөрийн маргаан',
  REAL_ESTATE: 'Үл хөдлөх хөрөнгө',
  OTHER: 'Бусад',
};

export const SERVICE_REQUEST_TYPE_LABELS: Record<string, string> = {
  LAWYER: 'Өмгөөлөгч авах',
  CONSULTATION: 'Зөвлөгөө авах',
};

export const SERVICE_REQUEST_STATUS_LABELS: Record<string, string> = {
  NEW: 'Шинэ',
  ACCEPTED: 'Хүлээж авсан',
  REJECTED: 'Татгалзсан',
  CONVERTED: 'Хэрэг нээгдсэн',
};

export const TESTIMONIAL_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Хянагдаагүй',
  PUBLISHED: 'Нийтэлсэн',
  REJECTED: 'Татгалзсан',
};

export const TESTIMONIAL_SOURCE_LABELS: Record<string, string> = {
  PORTAL: 'Порталаас',
  MANUAL: 'Гараар',
};

export const CASE_EVENT_LABELS: Record<string, string> = {
  NOTE: 'Тэмдэглэл',
  HEARING: 'Шүүх хурал',
  MEETING: 'Уулзалт',
  DEADLINE: 'Эцсийн хугацаа',
  STATUS_CHANGE: 'Төлөв өөрчлөгдсөн',
  DOCUMENT: 'Баримт бичиг',
};

export const INVOICE_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Ноорог',
  SENT: 'Илгээсэн',
  AWAITING_CONFIRMATION: 'Баталгаажуулж буй',
  PAID: 'Төлөгдсөн',
  OVERDUE: 'Хугацаа хэтэрсэн',
  CANCELLED: 'Цуцалсан',
};

export const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Админ',
  LAWYER: 'Хуульч',
  CLIENT: 'Харилцагч',
};
