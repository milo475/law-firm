import { hasLocale } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';
import { routing, type Locale } from './routing';

type Messages = Record<string, unknown>;

/**
 * Walks the Mongolian tree and takes the translated value wherever the firm filled one in, so an
 * untranslated (empty) key, a missing key and a half-filled list all read as Mongolian. Arrays stay
 * arrays — next-intl hands them to `t.raw()`.
 */
function withFallback(translated: unknown, fallback: unknown): unknown {
  if (Array.isArray(fallback)) {
    const source = Array.isArray(translated) ? translated : [];
    return fallback.map((item, index) => withFallback(source[index], item));
  }
  if (typeof fallback === 'string') {
    return typeof translated === 'string' && translated.trim().length > 0 ? translated : fallback;
  }
  if (fallback && typeof fallback === 'object') {
    const source = (translated && typeof translated === 'object' ? translated : {}) as Messages;
    return Object.fromEntries(Object.entries(fallback as Messages).map(([key, value]) => [key, withFallback(source[key], value)]));
  }
  return fallback;
}

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale: Locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  const mn = (await import('../../messages/mn.json')).default as Messages;
  const messages =
    locale === routing.defaultLocale
      ? mn
      : (withFallback((await import(`../../messages/${locale}.json`)).default, mn) as Messages);
  return {
    locale,
    messages,
    // Dates and numbers follow the language; money stays in ₮ everywhere.
    formats: {
      dateTime: {
        short: { year: 'numeric', month: '2-digit', day: '2-digit' },
        long: { year: 'numeric', month: 'long', day: 'numeric' },
      },
    },
    now: new Date(),
    timeZone: 'Asia/Ulaanbaatar',
  };
});
