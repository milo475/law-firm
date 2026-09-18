// Shared helpers for the news list + article detail pages (Figma: Public / 07 News, 08 Article Detail).

export const NEWS_CATEGORIES = ['NEWS', 'ADVICE', 'LEGAL_UPDATE'] as const;

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
