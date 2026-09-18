import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Footer } from '@/components/ui/footer';
import { LocaleSuggestion } from '@/components/ui/locale-suggestion';
import { NavHeader } from '@/components/ui/nav-header';
import type { Locale } from '@/i18n/routing';
import { suggestedLocale } from '@/lib/locale-suggestion';

export default async function SiteLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, suggested] = await Promise.all([getTranslations('site'), suggestedLocale(locale as Locale)]);
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-bg-surface focus:px-4 focus:py-2 focus:text-body-medium focus:text-text-brand focus:shadow-menu">
        {t('skipToContent')}
      </a>
      {suggested && <LocaleSuggestion suggested={suggested} />}
      <NavHeader />
      <main id="main" className="flex-1 bg-bg-page">{children}</main>
      <Footer />
    </>
  );
}
