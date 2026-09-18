// Figma: 01 Public Site / Public / 06 Service Detail / Desktop (20:500) + Mobile (25:1417)
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { ChevronRightIcon } from '@/components/icons';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { COMMITMENTS, priceRow } from '@/content/commitments';
import { SERVICES, SERVICE_FAQ_IDS, findService, type ServicePricingRow } from '@/content/services';
import { isSpecializationKey, matchesSpecialization } from '@/content/specializations';
import { OriginalLanguageNote, TestimonialCard } from '@/components/ui/testimonial-card';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { apiFetch, type LawyerProfile, type PublicTestimonial } from '@/lib/api';
import { alternateLanguages } from '@/lib/seo';
import { initials, shortName } from '@/lib/utils';
import { ServiceFaqAccordion } from './faq-accordion';

type Params = { params: Promise<{ locale: string; slug: string }> };

export function generateStaticParams() {
  return SERVICES.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale, slug } = await params;
  const t = await getTranslations({ locale, namespace: 'servicesPage' });
  if (!findService(slug)) return { title: t('notFound') };
  const tCatalog = await getTranslations({ locale, namespace: 'services.catalog' });
  return {
    title: tCatalog(`${slug}.title`),
    description: tCatalog(`${slug}.short`),
    alternates: { languages: alternateLanguages(`/services/${slug}`) },
  };
}

/**
 * Lawyers whose specialisations mention this service; falls back to the first profiles. null when the API failed.
 * Matching goes through the slug, not the heading: the heading is translated, the firm's specialisations are
 * Mongolian free text (see content/specializations.ts).
 */
async function lawyersFor(slug: string): Promise<LawyerProfile[] | null> {
  try {
    const all = await apiFetch<LawyerProfile[]>('/lawyers', { next: { revalidate: 60 } });
    const matched = isSpecializationKey(slug)
      ? all.filter((l) => matchesSpecialization([...l.specializations, l.title], slug))
      : [];
    return (matched.length ? matched : all).slice(0, 3);
  } catch {
    return null;
  }
}

/** Published testimonials from this area of law; an empty list hides the whole block. */
async function testimonialsFor(caseType: string): Promise<PublicTestimonial[]> {
  try {
    return await apiFetch<PublicTestimonial[]>(`/testimonials?caseType=${caseType}&limit=2`, { next: { revalidate: 60 } });
  } catch {
    return [];
  }
}

/** Breadcrumb on the navy hero — the shared Breadcrumb is fixed to light-surface colours (see report). */
function InverseBreadcrumb({ items, label }: { items: { label: string; href?: string }[]; label: string }) {
  return (
    <nav aria-label={label}>
      <ol className="flex flex-wrap items-center gap-2.5">
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li key={item.label} className="flex items-center gap-2.5">
              {item.href && !last ? (
                <Link href={item.href} className="focus-ring rounded-sm text-body-sm text-text-on-inverse-muted hover:text-text-on-inverse">{item.label}</Link>
              ) : (
                <span className="text-body-sm-medium text-text-on-inverse" aria-current={last ? 'page' : undefined}>{item.label}</span>
              )}
              {!last && <ChevronRightIcon size={5} className="text-text-on-inverse-muted" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function DotList({ items }: { items: string[] }) {
  return (
    <ul className="flex w-full flex-col gap-2.5">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2.5 md:gap-3">
          <span aria-hidden className="mt-2.5 size-1.5 shrink-0 rounded-full bg-accent-default" />
          <span className="text-body text-text-secondary">{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default async function ServiceDetailPage({ params }: Params) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const service = findService(slug);
  if (!service) notFound();
  const [t, tCommon, tCatalog, tServices, tReviews] = await Promise.all([
    getTranslations('servicesPage'),
    getTranslations('common'),
    getTranslations('services.catalog'),
    getTranslations('services'),
    getTranslations('reviews'),
  ]);
  const title = tCatalog(`${slug}.title`);
  const [lawyers, testimonials] = await Promise.all([lawyersFor(slug), testimonialsFor(service.caseType)]);
  const faqItems = (SERVICE_FAQ_IDS[slug] ?? []).map((id) => ({
    id,
    question: tCatalog(`${slug}.faq.${id}.question`),
    answer: tCatalog(`${slug}.faq.${id}.answer`),
  }));
  const pricing: ServicePricingRow[] = [
    ...priceRow(tServices('commitments.firstConsultation'), COMMITMENTS.firstConsultation),
    ...priceRow(tServices('commitments.writtenOpinion'), COMMITMENTS.writtenOpinion),
    ...priceRow(tServices('commitments.assetCheck'), COMMITMENTS.assetCheck),
    ...priceRow(tServices('commitments.urgentResponse'), COMMITMENTS.urgentResponse),
    ...(tCatalog.raw(`${slug}.pricing`) as ServicePricingRow[]),
  ];

  return (
    <>
      {/* Hero (20:526 / 25:1428) — navy band */}
      <section className="bg-bg-inverse">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-3.5 px-5 py-10 md:gap-5 md:px-6 md:py-16">
          <InverseBreadcrumb
            label={tCommon('breadcrumb')}
            items={[{ label: tCommon('home'), href: '/' }, { label: t('crumb'), href: '/services' }, { label: title }]}
          />
          <h1 className="max-w-[900px] text-h2 text-text-on-inverse md:text-h1">{title}</h1>
          <p className="max-w-[760px] text-body text-text-on-inverse-muted md:text-body-lg">{tCatalog(`${slug}.intro`)}</p>
        </div>
      </section>

      {/* Content (20:535 / 25:1432) — main column + 320px sidebar */}
      <section className="bg-bg-surface">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-5 py-14 md:px-6 md:py-24 lg:flex-row lg:items-start lg:gap-16">
          <article className="flex min-w-0 flex-1 flex-col gap-6 md:gap-8">
            <h2 className="text-h3 md:text-h2">{t('whatWeDo')}</h2>
            {(tCatalog.raw(`${slug}.body`) as string[]).map((paragraph) => (
              <p key={paragraph} className="max-w-[740px] text-body text-text-secondary">{paragraph}</p>
            ))}

            <h3 className="text-h4 md:text-h3">{t('scope')}</h3>
            <DotList items={tCatalog.raw(`${slug}.items`) as string[]} />

            <aside className="flex w-full max-w-[740px] flex-col gap-2 rounded-md border-l-[3px] border-accent-default bg-bg-accent-soft p-4.5 md:gap-2.5 md:px-6 md:py-5">
              <p className="text-body-medium text-text-brand">{tCatalog(`${slug}.note.title`)}</p>
              <p className="text-body-sm text-text-secondary">{tCatalog(`${slug}.note.text`)}</p>
            </aside>

            <h3 className="text-h4 md:text-h3">{t('faqHeading')}</h3>
            <ServiceFaqAccordion items={faqItems} />

            {/* Testimonials from this area — hidden entirely when there are none. */}
            {testimonials.length > 0 && (
              <div className="flex flex-col gap-4 md:gap-6">
                <h3 className="text-h4 md:text-h3">{tReviews('serviceTitle')}</h3>
                <OriginalLanguageNote locale={locale as Locale} />
                <ul className="grid gap-4 md:grid-cols-2 md:gap-6">
                  {testimonials.map((testimonial) => (
                    <li key={testimonial.id}>
                      <TestimonialCard testimonial={testimonial} locale={locale as Locale} />
                    </li>
                  ))}
                </ul>
                <div>
                  <Button asChild variant="secondary" size="md"><Link href={`/reviews?type=${slug}`}>{tReviews('all')}</Link></Button>
                </div>
              </div>
            )}
          </article>

          <aside className="flex w-full flex-col gap-6 lg:w-[320px] lg:shrink-0">
            {/* Lawyers card (20:590 / 25:1475) */}
            <div className="flex flex-col gap-3.5 rounded-lg border border-border-default bg-bg-page p-5 md:gap-4 md:p-6">
              <h2 className="text-body-medium text-text-primary">{t('lawyersHeading')}</h2>
              {!lawyers ? (
                <p className="text-body-sm text-text-muted">{tCommon('lawyersUnavailable')}</p>
              ) : lawyers.length === 0 ? (
                <p className="text-body-sm text-text-muted">{tCommon('lawyersComingSoon')}</p>
              ) : (
                <ul className="flex flex-col gap-3.5 md:gap-4">
                  {lawyers.map((l) => (
                    <li key={l.id}>
                      <Link href={`/lawyers/${l.id}`} className="focus-ring flex min-h-11 items-center gap-3 rounded-sm hover:text-text-brand">
                        <Avatar size="md" initials={initials(l.user.firstName, l.user.lastName)} src={l.user.avatarUrl} className="size-11" />
                        <span className="flex flex-col gap-0.5">
                          <span className="text-body-sm-medium text-text-primary">{shortName(l.user.firstName, l.user.lastName)}</span>
                          <span className="text-caption text-text-muted">{tCommon('yearsOfExperience', { years: l.yearsOfExperience })}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              <Button asChild size="md" className="w-full">
                <Link href="/contact">{tCommon('getAdvice')}</Link>
              </Button>
            </div>

            {/* Price card (20:606) — desktop only in the design */}
            <div className="hidden flex-col gap-3 rounded-lg border border-border-default bg-bg-surface p-6 lg:flex">
              <h2 className="text-body-medium text-text-primary">{t('pricingHeading')}</h2>
              <dl className="flex flex-col gap-3">
                {pricing.map((row) => (
                  <div key={row.label} className="flex items-start justify-between gap-4">
                    <dt className="text-body-sm text-text-secondary">{row.label}</dt>
                    <dd className="text-right text-body-sm-medium text-text-primary">{row.value}</dd>
                  </div>
                ))}
              </dl>
              <p className="text-caption text-text-muted">{t('pricingNote')}</p>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
