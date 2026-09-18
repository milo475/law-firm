// Public legal page linked from the footer: what the firm and the client portal do with personal data.
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PageHeader } from '@/components/ui/page-header';
import { Link } from '@/i18n/navigation';
import { alternateLanguages } from '@/lib/seo';
import { loadFirmSettings } from '@/lib/firm';
import { formatPhone, phoneHref } from '@/lib/format';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'privacy' });
  return { title: t('metaTitle'), description: t('metaDescription'), alternates: { languages: alternateLanguages('/privacy') } };
}

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [firm, t, tCommon] = await Promise.all([loadFirmSettings(), getTranslations('privacy'), getTranslations('common')]);
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
          <p className="text-body-sm text-text-muted">{t('updated', { date: t('updatedDate') })}</p>
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
              {t('contactSuffix', { address: firm.address })}
            </p>
            <p className="text-body-sm text-text-muted">
              {t('termsPrefix')}{' '}
              <Link href="/terms" className="focus-ring rounded-sm text-text-accent hover:underline">{t('termsLink')}</Link> {t('termsSuffix')}
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
