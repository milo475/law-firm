// Shared helpers for the news list + article detail pages (Figma: Public / 07 News, 08 Article Detail).

export const NEWS_CATEGORIES = ['NEWS', 'ADVICE', 'LEGAL_UPDATE'] as const;

/** Chip / overline copy exactly as in Figma (shorter than CATEGORY_LABELS in lib/format.ts). */
export const NEWS_CATEGORY_LABELS: Record<string, string> = {
  NEWS: 'Мэдээ',
  ADVICE: 'Зөвлөгөө',
  LEGAL_UPDATE: 'Хуулийн шинэчлэл',
};

export function buildNewsHref(params: { category?: string; search?: string; page?: number }): string {
  const qs = new URLSearchParams();
  if (params.category) qs.set('category', params.category);
  if (params.search) qs.set('search', params.search);
  if (params.page && params.page > 1) qs.set('page', String(params.page));
  const s = qs.toString();
  return s ? `/news?${s}` : '/news';
}

/** Reading time derived from the markdown body (~200 words per minute, minimum 1). */
export function readingMinutes(content: string): number {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

/** "2026 оны 9 сарын 8" — long Mongolian date used in the article header on desktop. */
export function formatDateLong(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return `${date.getFullYear()} оны ${date.getMonth() + 1} сарын ${date.getDate()}`;
}
