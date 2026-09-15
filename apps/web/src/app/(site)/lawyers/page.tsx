// Figma: 01 Public Site / Public / 03 Lawyers / Desktop (18:305) + Mobile (24:1279)
import type { Metadata } from 'next';
import Link from 'next/link';
import { LawyerCard } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Pagination } from '@/components/ui/pagination';
import { EmptyState } from '@/components/ui/states';
import { apiFetch, type LawyerProfile } from '@/lib/api';
import { cn, shortName } from '@/lib/utils';

export const metadata: Metadata = { title: 'Хуульчид', description: 'Чиглэл тус бүрээр мэргэшсэн хуульчдаас танд тохирохыг нь сонгоно уу.' };
export const revalidate = 60;

/** Filter chips — the label is matched (case-insensitive) against each lawyer's specializations. */
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

export default async function LawyersPage({ searchParams }: { searchParams: SearchParams }) {
  const { spec, page: pageParam } = await searchParams;
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
        title="Хуульчдын баг"
        description={lawyers.length > 0 ? `Чиглэл тус бүрээр мэргэшсэн ${lawyers.length} хуульчаас танд тохирохыг нь сонгоно уу.` : 'Чиглэл тус бүрээр мэргэшсэн хуульчдаас танд тохирохыг нь сонгоно уу.'}
        crumbs={[{ label: 'Нүүр', href: '/' }, { label: 'Хуульчид' }]}
      />

      <section className="bg-bg-surface">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-5 py-14 md:px-6 lg:gap-12 lg:py-24">
          {/* Filters */}
          <nav aria-label="Мэргэшлийн чиглэлээр шүүх" className="flex flex-wrap gap-2.5 md:gap-3">
            <FilterChip href={buildHref(undefined, 1)} active={!activeSpec}>Бүгд</FilterChip>
            {FILTERS.map((f) => (
              <FilterChip key={f} href={buildHref(f, 1)} active={activeSpec === f}>{f}</FilterChip>
            ))}
          </nav>

          {failed ? (
            <EmptyState title="Хуульчдын мэдээлэл ачаалагдсангүй" description="API-тай холбогдож чадсангүй. Түр хүлээгээд дахин оролдоно уу." />
          ) : visible.length === 0 ? (
            <EmptyState
              title={activeSpec ? `"${activeSpec}" чиглэлээр хуульч олдсонгүй` : 'Хуульчийн мэдээлэл байхгүй байна'}
              description={activeSpec ? 'Өөр чиглэл сонгох эсвэл "Бүгд" дээр дарна уу.' : undefined}
            />
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
              {visible.map((l) => (
                <li key={l.id}>
                  <LawyerCard
                    name={shortName(l.user.firstName, l.user.lastName)}
                    title={l.specializations.length ? l.specializations.slice(0, 2).join(', ') : l.title}
                    experience={`${l.yearsOfExperience} жилийн туршлага`}
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
