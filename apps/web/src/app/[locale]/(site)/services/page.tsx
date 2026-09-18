// Figma: 01 Public Site / Public / 05 Services / Desktop (19:526) + Mobile (25:1254)
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { SERVICES } from '@/content/services';
import { Link } from '@/i18n/navigation';
import { alternateLanguages } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'servicesPage' });
  return { title: t('metaTitle'), description: t('metaDescription'), alternates: { languages: alternateLanguages('/services') } };
}

export default async function ServicesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, tCommon, tCatalog, tProcess] = await Promise.all([
    getTranslations('servicesPage'),
    getTranslations('common'),
    getTranslations('services.catalog'),
    getTranslations('services'),
  ]);
  const process = tProcess.raw('process') as { title: string; text: string }[];

  return (
    <>
      <PageHeader
        title={t('title')}
        description={t('description')}
        crumbs={[{ label: tCommon('home'), href: '/' }, { label: t('crumb'), href: '/services' }, { label: t('crumbAll') }]}
      />

      {/* Services grid — 2 columns × 32px gap on desktop, stacked with 20px gap on mobile */}
      <section aria-labelledby="services-heading" className="bg-bg-surface">
        <h2 id="services-heading" className="sr-only">{t('listHeading')}</h2>
        <div className="mx-auto grid max-w-[1200px] gap-5 px-5 py-14 md:grid-cols-2 md:gap-8 md:px-6 md:py-24">
          {SERVICES.map((service) => {
            const title = tCatalog(`${service.slug}.title`);
            return (
              /* Figma "Service" card (19:563): gold accent bar, H3 title, one-line summary, three dot bullets and a text link. */
              <Card key={service.slug} className="flex flex-col items-start gap-3.5 px-5 py-6 md:gap-4 md:p-8">
                <span aria-hidden className="h-1 w-8 rounded-full bg-accent-default md:w-10" />
                <h2 className="text-h4 md:text-h3">{title}</h2>
                <p className="text-body text-text-secondary">{tCatalog(`${service.slug}.short`)}</p>
                <ul className="flex w-full flex-col gap-2.5">
                  {(tCatalog.raw(`${service.slug}.highlights`) as string[]).map((item) => (
                    <li key={item} className="flex items-start gap-2.5 md:gap-3">
                      <span aria-hidden className="mt-2.5 size-1.5 shrink-0 rounded-full bg-accent-default" />
                      <span className="text-body text-text-secondary">{item}</span>
                    </li>
                  ))}
                </ul>
                <Link href={`/services/${service.slug}`} className="focus-ring inline-flex h-11 items-center rounded-sm text-body-medium text-text-accent hover:underline md:mt-2">
                  {tCommon('readMore')}
                  <span className="sr-only"> — {title}</span>
                </Link>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Process band — "Хамтран ажиллах явц / Дөрвөн алхмаар" */}
      <section aria-labelledby="process-heading" className="bg-bg-inverse">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-7 px-5 py-14 md:gap-12 md:px-6 md:py-24">
          <div className="flex flex-col gap-3 md:gap-4">
            <p className="text-overline text-accent-default">{t('processOverline')}</p>
            <h2 id="process-heading" className="text-h3 text-text-on-inverse md:text-h2">{t('processTitle')}</h2>
          </div>
          <ol className="grid gap-7 md:grid-cols-4 md:gap-8">
            {process.map((step, i) => (
              <li key={step.title} className="flex gap-3.5 md:flex-col md:gap-2.5">
                <span aria-hidden className="text-h4 text-accent-default md:text-h3">{String(i + 1).padStart(2, '0')}</span>
                <div className="flex min-w-0 flex-1 flex-col gap-1 md:gap-2.5">
                  <h3 className="text-body-medium text-text-on-inverse">
                    <span className="sr-only">{t('step', { number: i + 1 })} </span>
                    {step.title}
                  </h3>
                  <p className="text-body-sm text-text-on-inverse-muted">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}
