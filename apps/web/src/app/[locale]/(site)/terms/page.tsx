// Public legal page linked from the footer: the terms the firm and its clients work under.
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PageHeader } from '@/components/ui/page-header';
import { Link } from '@/i18n/navigation';
import { alternateLanguages } from '@/lib/seo';
import { loadFirmSettings } from '@/lib/firm';
import { formatPhone, phoneHref } from '@/lib/format';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'terms' });
  return { title: t('metaTitle'), description: t('metaDescription'), alternates: { languages: alternateLanguages('/terms') } };
}

export default async function TermsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [firm, t, tCommon] = await Promise.all([loadFirmSettings(), getTranslations('terms'), getTranslations('common')]);
  const sections = t.raw('sections') as { title: string; items: string[] }[];
  return (
    <>
      <PageHeader
        title={t('title')}
        description={t('description')}
        crumbs={[{ label: tCommon('home'), href: '/' }, { label: t('crumb') }]}
      />
      <section className="bg-bg-surface">
        <div className="mx-auto flex max-w-[840px] flex-col gap-8 px-5 py-14 md:px-6 md:py-20">
          <p className="text-body-sm text-text-muted">
            {t('updated', { date: t('updatedDate') })} · {firm.name}
            {firm.registrationNumber ? ` · ${t('registration', { number: firm.registrationNumber })}` : ''}
          </p>
          {sections.map((section) => (
            <div key={section.title} className="flex flex-col gap-3">
              <h2 className="text-h4 text-text-primary md:text-h3">{section.title}</h2>
              <ul className="flex flex-col gap-2">
                {section.items.map((item) => (
                  <li key={item} className="flex gap-2.5 text-body text-text-secondary">
                    <span aria-hidden className="mt-2.5 size-1.5 shrink-0 rounded-full bg-text-accent" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div className="flex flex-col gap-3 rounded-lg bg-bg-page p-6">
            <h2 className="text-h4 text-text-primary">{t('contactTitle')}</h2>
            <p className="text-body text-text-secondary">
              {t('contactPrefix')}{' '}
              <a href={`mailto:${firm.email}`} className="focus-ring rounded-sm text-text-accent hover:underline">{firm.email}</a>{' '}
              {t('contactOr')}{' '}
              <a href={phoneHref(firm.phone)} className="focus-ring rounded-sm text-text-accent hover:underline">{formatPhone(firm.phone)}</a>{' '}
              {t('contactSuffix')}
            </p>
            <p className="text-body-sm text-text-muted">
              {t('privacyPrefix')}{' '}
              <Link href="/privacy" className="focus-ring rounded-sm text-text-accent hover:underline">{t('privacyLink')}</Link> {t('privacySuffix')}
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
