import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/states';
import { OriginalLanguageNote, TestimonialCard } from '@/components/ui/testimonial-card';
import { SERVICES, findService } from '@/content/services';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { apiFetch, type PublicTestimonial } from '@/lib/api';
import { alternateLanguages } from '@/lib/seo';
import { cn } from '@/lib/utils';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'reviews' });
  return { title: t('metaTitle'), description: t('metaDescription'), alternates: { languages: alternateLanguages('/reviews') } };
}
export const revalidate = 60;

type SearchParams = Promise<{ type?: string }>;

/** Figma "Chip", as on the lawyers page: the URL carries the service slug, the label follows the reader. */
function FilterChip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={active ? 'true' : undefined}
      className={cn(
        'focus-ring inline-flex h-11 items-center justify-center rounded-full px-4 text-body-sm-medium transition-colors md:px-5',
        active ? 'bg-brand-primary text-text-on-inverse' : 'border border-border-default bg-bg-surface text-text-secondary hover:bg-bg-brand-soft hover:text-text-brand',
      )}
    >
      {children}
    </Link>
  );
}

export default async function ReviewsPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: SearchParams }) {
  const [{ locale }, { type }] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);
  const [t, tCommon, tShort] = await Promise.all([
    getTranslations('reviews'),
    getTranslations('common'),
    getTranslations('services.short'),
  ]);

  const service = type ? findService(type) : undefined;
  const query = new URLSearchParams({ limit: '50' });
  if (service) query.set('caseType', service.caseType);

  let testimonials: PublicTestimonial[] = [];
  let failed = false;
  try {
    testimonials = await apiFetch<PublicTestimonial[]>(`/testimonials?${query.toString()}`, { next: { revalidate: 60 } });
  } catch {
    failed = true;
  }

  return (
    <>
      <PageHeader
        title={t('title')}
        description={t('description')}
        crumbs={[{ label: tCommon('home'), href: '/' }, { label: t('crumb') }]}
      />

      <section className="bg-bg-surface">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-5 py-14 md:px-6 lg:gap-10 lg:py-24">
          <nav aria-label={t('filterLabel')} className="flex flex-wrap gap-2.5 md:gap-3">
            <FilterChip href="/reviews" active={!service}>{tCommon('all')}</FilterChip>
            {SERVICES.map((item) => (
              <FilterChip key={item.slug} href={`/reviews?type=${item.slug}`} active={service?.slug === item.slug}>
                {tShort(item.slug)}
              </FilterChip>
            ))}
          </nav>

          <OriginalLanguageNote locale={locale as Locale} />

          {failed ? (
            <EmptyState title={t('failedTitle')} description={t('failedDescription')} />
          ) : testimonials.length === 0 ? (
            <EmptyState title={t('noneTitle')} description={service ? t('noneFiltered') : t('noneDescription')} />
          ) : (
            <>
              <p className="text-body-sm text-text-muted">{t('count', { count: testimonials.length })}</p>
              <ul className="grid gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
                {testimonials.map((testimonial) => (
                  <li key={testimonial.id}>
                    <TestimonialCard testimonial={testimonial} locale={locale as Locale} />
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </section>
    </>
  );
}
