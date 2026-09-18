// Figma: 01 Public Site / Public / 03 Lawyers / Desktop (18:305) + Mobile (24:1279)
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { LawyerCard } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Pagination } from '@/components/ui/pagination';
import { EmptyState } from '@/components/ui/states';
import { Link } from '@/i18n/navigation';
import { apiFetch, type LawyerProfile } from '@/lib/api';
import { alternateLanguages } from '@/lib/seo';
import { cn, shortName } from '@/lib/utils';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'lawyers' });
  return { title: t('metaTitle'), description: t('metaDescription'), alternates: { languages: alternateLanguages('/lawyers') } };
}
export const revalidate = 60;

/**
 * Filter chips — matched (case-insensitive) against each lawyer's specializations, which the firm
 * enters in Mongolian, so the chips stay Mongolian in every language.
 */
const FILTERS = ['Иргэний', 'Эрүүгийн', 'Гэр бүлийн', 'Бизнесийн', 'Хөдөлмөрийн', 'Үл хөдлөх'];
const PAGE_SIZE = 8;

type SearchParams = Promise<{ spec?: string; page?: string }>;

function matches(lawyer: LawyerProfile, spec: string): boolean {
  const needle = spec.toLowerCase();
  return lawyer.specializations.some((s) => s.toLowerCase().includes(needle)) || lawyer.title.toLowerCase().includes(needle);
}

function buildHref(spec: string | undefined, page: number): string {
  const q = new URLSearchParams();
  if (spec) q.set('spec', spec);
  if (page > 1) q.set('page', String(page));
  const s = q.toString();
  return s ? `/lawyers?${s}` : '/lawyers';
}

/** Figma "Chip": 44px pill, active = brand-primary, inactive = surface + border-default. */
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

export default async function LawyersPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: SearchParams }) {
  const [{ locale }, { spec, page: pageParam }] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);
  const [t, tCommon] = await Promise.all([getTranslations('lawyers'), getTranslations('common')]);
  const activeSpec = spec && FILTERS.includes(spec) ? spec : undefined;

  let lawyers: LawyerProfile[] = [];
  let failed = false;
  try {
    lawyers = await apiFetch<LawyerProfile[]>('/lawyers', { next: { revalidate: 60 } });
  } catch {
    failed = true;
  }

  const filtered = activeSpec ? lawyers.filter((l) => matches(l, activeSpec)) : lawyers;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(Math.max(1, Number(pageParam) || 1), totalPages);
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <>
      <PageHeader
        title={t('title')}
        description={lawyers.length > 0 ? t('descriptionCounted', { count: lawyers.length }) : t('description')}
        crumbs={[{ label: tCommon('home'), href: '/' }, { label: t('crumb') }]}
      />

      <section className="bg-bg-surface">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-5 py-14 md:px-6 lg:gap-12 lg:py-24">
          {/* Filters */}
          <nav aria-label={t('filterLabel')} className="flex flex-wrap gap-2.5 md:gap-3">
            <FilterChip href={buildHref(undefined, 1)} active={!activeSpec}>{tCommon('all')}</FilterChip>
            {FILTERS.map((f) => (
              <FilterChip key={f} href={buildHref(f, 1)} active={activeSpec === f}>{f}</FilterChip>
            ))}
          </nav>

          {failed ? (
            <EmptyState title={t('failedTitle')} description={t('failedDescription')} />
          ) : visible.length === 0 ? (
            <EmptyState
              title={activeSpec ? t('noneForFilter', { spec: activeSpec }) : t('noneTitle')}
              description={activeSpec ? t('noneDescription') : undefined}
            />
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
              {visible.map((l) => (
                <li key={l.id}>
                  <LawyerCard
                    name={shortName(l.user.firstName, l.user.lastName)}
                    title={l.specializations.length ? l.specializations.slice(0, 2).join(', ') : l.title}
                    experience={tCommon('yearsOfExperience', { years: l.yearsOfExperience })}
                    href={`/lawyers/${l.id}`}
                    imageUrl={l.user.avatarUrl}
                    className="h-full"
                  />
                </li>
              ))}
            </ul>
          )}

          {totalPages > 1 && (
            <div className="flex justify-center">
              <Pagination page={page} totalPages={totalPages} hrefFor={(p) => buildHref(activeSpec, p)} />
            </div>
          )}
        </div>
      </section>
    </>
  );
}
