import { routing, BCP47, type Locale } from '@/i18n/routing';

/** Absolute site URL used for metadataBase and the hreflang links. */
export function siteUrl(): URL {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, '');
  return new URL(configured || 'http://localhost:3001');
}

/** `/services` → the same page in each language, for `alternates.languages`. */
export function alternateLanguages(pathname: string): Record<string, string> {
  const path = pathname === '/' ? '' : pathname.replace(/\/$/, '');
  const languages: Record<string, string> = {};
  for (const locale of routing.locales) {
    const prefix = locale === routing.defaultLocale ? '' : `/${locale}`;
    languages[BCP47[locale as Locale]] = `${prefix}${path}` || '/';
  }
  languages['x-default'] = path || '/';
  return languages;
}
