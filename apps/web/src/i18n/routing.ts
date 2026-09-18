import { defineRouting } from 'next-intl/routing';

/**
 * Mongolian is the site's language and keeps the unprefixed URLs (`/services`); English and
 * Chinese live under `/en/...` and `/zh/...`. Nothing redirects on its own: a first-time visitor
 * always gets Mongolian and is only *offered* their language (see LocaleSuggestion), so shared
 * links always open what the sender saw.
 */
export const routing = defineRouting({
  locales: ['mn', 'en', 'zh'],
  defaultLocale: 'mn',
  localePrefix: 'as-needed',
  localeDetection: false,
  localeCookie: {
    name: 'NEXT_LOCALE',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  },
});

export type Locale = (typeof routing.locales)[number];

/** BCP-47 tags for `<html lang>`, hreflang and Intl — Chinese is served in simplified script. */
export const BCP47: Record<Locale, string> = {
  mn: 'mn-MN',
  en: 'en',
  zh: 'zh-Hans',
};

/** What the switcher shows for each language, in that language. */
export const LOCALE_LABELS: Record<Locale, { short: string; name: string }> = {
  mn: { short: 'MN', name: 'Монгол' },
  en: { short: 'EN', name: 'English' },
  zh: { short: '中文', name: '简体中文' },
};
