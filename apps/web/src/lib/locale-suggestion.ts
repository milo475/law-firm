import { cookies, headers } from 'next/headers';
import { routing, type Locale } from '@/i18n/routing';

/**
 * The language to offer a first-time visitor, from Accept-Language. Returns null once they have
 * chosen (the NEXT_LOCALE cookie) or when their browser already asks for the current language —
 * nothing redirects, the header just offers the switch.
 */
export async function suggestedLocale(current: Locale): Promise<Locale | null> {
  const [cookieStore, headerList] = await Promise.all([cookies(), headers()]);
  if (cookieStore.has('NEXT_LOCALE')) return null;
  const accepted = headerList.get('accept-language');
  if (!accepted) return null;
  const ranked = accepted
    .split(',')
    .map((part) => {
      const [tag, q] = part.trim().split(';q=');
      return { tag: tag.trim().toLowerCase(), q: q ? Number(q) : 1 };
    })
    .sort((a, b) => b.q - a.q);
  for (const { tag } of ranked) {
    const base = tag.split('-')[0];
    const match = routing.locales.find((locale) => locale === base);
    if (match) return match === current ? null : (match as Locale);
  }
  return null;
}
