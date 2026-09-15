export function formatDate(value: string | Date | null | undefined, withTime = false): string {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '—';
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  if (!withTime) return `${yyyy}.${mm}.${dd}`;
  const hh = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  return `${yyyy}.${mm}.${dd} ${hh}:${mi}`;
}

/** 1500000 → "1 500 000₮" (space thousands separator, as in the Figma portal frames) */
export function formatMoney(value: string | number): string {
  const amount = typeof value === 'string' ? Number(value) : value;
  if (Number.isNaN(amount)) return '—';
  return `${amount.toLocaleString('en-US', { maximumFractionDigits: 2 }).replace(/,/g, ' ')}₮`;
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
