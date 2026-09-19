import type { Metadata } from 'next';
import { Inter, Noto_Sans_SC, Source_Serif_4 } from 'next/font/google';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Toaster } from '@/components/ui/toast';
import { QueryProvider } from '@/components/providers/query-provider';
import { BCP47, routing, type Locale } from '@/i18n/routing';
import { alternateLanguages, siteUrl } from '@/lib/seo';
import '../globals.css';

// Figma: headings — Source Serif 4, body — Inter (both with Cyrillic subset).
const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-inter',
  display: 'swap',
});

const sourceSerif = Source_Serif_4({
  subsets: ['latin', 'cyrillic'],
  weight: ['600', '700'],
  variable: '--font-source-serif',
  display: 'swap',
});

/** Inter has no Han glyphs, so the Chinese pages (and only those) load Noto Sans SC. */
const notoSansSC = Noto_Sans_SC({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-noto-sans-sc',
  display: 'swap',
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations({ locale, namespace: 'site' });
  return {
    metadataBase: siteUrl(),
    title: { default: t('name'), template: `%s | ${t('name')}` },
    description: t('description'),
    alternates: { languages: alternateLanguages('/') },
    openGraph: {
      title: t('name'),
      description: t('description'),
      locale: BCP47[locale],
      type: 'website',
      siteName: t('name'),
      url: locale === routing.defaultLocale ? '/' : `/${locale}`,
    },
    // Facebook and Messenger read the OG tags; X needs to be told the card is a large image.
    twitter: { card: 'summary_large_image', title: t('name'), description: t('description') },
    icons: {
      icon: '/icon.png',
      apple: '/apple-icon.png',
    },
    manifest: '/manifest.webmanifest',
  };
}

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const fonts = [inter.variable, sourceSerif.variable, ...(locale === 'zh' ? [notoSansSC.variable] : [])].join(' ');
  return (
    <html lang={BCP47[locale as Locale]} className={fonts} data-locale={locale}>
      <body className="flex min-h-screen flex-col">
        <NextIntlClientProvider>
          <QueryProvider>{children}</QueryProvider>
          <Toaster />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
