// Figma: 01 Public Site / Public / 02 About / Desktop (18:173) + Mobile (24:1171)
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ImagePlaceholder } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { alternateLanguages } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'about' });
  return { title: t('metaTitle'), description: t('metaDescription'), alternates: { languages: alternateLanguages('/about') } };
}

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, tCommon] = await Promise.all([getTranslations('about'), getTranslations('common')]);
  const values = t.raw('valueItems') as { title: string; text: string }[];
  const process = t.raw('processSteps') as { step: string; title: string; text: string }[];
  return (
    <>
      <PageHeader
        title={t('title')}
        description={t('description')}
        crumbs={[{ label: tCommon('home'), href: '/' }, { label: t('crumb') }]}
      />

      {/* Story — copy (560) + image placeholder (520×420); image stacks on top on mobile */}
      <section className="bg-bg-surface">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-5 px-5 py-14 md:px-6 lg:flex-row lg:items-center lg:gap-20 lg:py-24">
          <div className="flex flex-col gap-5 lg:w-[560px] lg:shrink-0 lg:gap-6">
            <p className="text-overline text-text-accent">{t('story.overline')}</p>
            <h2 className="text-h3 md:text-h2">{t('story.title')}</h2>
            <p className="text-body text-text-secondary">{t('story.p1')}</p>
            <p className="text-body text-text-secondary">{t('story.p2')}</p>
          </div>
          <ImagePlaceholder className="order-first h-[220px] rounded-lg lg:order-none lg:h-[420px] lg:flex-1" markSize={56} />
        </div>
      </section>

      {/* Mission & values — 4 cards with a gold accent bar */}
      <section className="bg-bg-page">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-8 px-5 py-14 md:px-6 lg:gap-12 lg:py-24">
          <div className="flex flex-col gap-3 lg:gap-4">
            <p className="text-overline text-text-accent">{t('values.overline')}</p>
            <h2 className="max-w-[860px] text-h3 md:text-h2">{t('values.title')}</h2>
          </div>
          <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 lg:gap-8">
            {values.map((v) => (
              <li key={v.title} className="flex flex-col gap-2.5 rounded-lg border border-border-default bg-bg-surface p-5 lg:gap-3 lg:p-7">
                <span aria-hidden className="h-1 w-8 rounded-[2px] bg-accent-default lg:w-10" />
                <h3 className="text-h4">{v.title}</h3>
                <p className="text-body-sm text-text-secondary">{v.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Timeline — navy band, 5 steps in a row (desktop) / dot list (mobile) */}
      <section className="bg-bg-inverse">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-8 px-5 py-14 md:px-6 lg:gap-12 lg:py-24">
          <div className="flex flex-col gap-3 lg:gap-4">
            <p className="text-overline text-accent-default">{t('process.overline')}</p>
            <h2 className="text-h3 text-text-on-inverse md:text-h2">{t('process.title')}</h2>
          </div>
          <ol className="flex flex-col gap-6 lg:flex-row lg:gap-0">
            {process.map((p) => (
              <li key={p.step} className="flex gap-3.5 lg:flex-1 lg:flex-col lg:gap-2.5 lg:pr-6">
                <span aria-hidden className="mt-2 size-2.5 shrink-0 rounded-full bg-accent-default lg:mt-0 lg:size-3.5" />
                <div className="flex flex-col gap-1 lg:gap-2.5">
                  <span className="text-h4 text-accent-default lg:text-h3">{p.step}</span>
                  <p className="text-body-medium text-text-on-inverse">{p.title}</p>
                  <p className="text-body-sm text-text-on-inverse-muted">{p.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}
