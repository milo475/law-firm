import type { Metadata } from 'next';
import Link from 'next/link';
import { NewsCard } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Pagination } from '@/components/ui/pagination';
import { EmptyState } from '@/components/ui/states';
import { apiFetch, type Paginated, type PostListItem } from '@/lib/api';
import { CATEGORY_LABELS, formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { NewsSearch } from './news-search';

export const metadata: Metadata = { title: 'Мэдээ ба нийтлэл', description: 'Хуулийн фирмийн мэдээ, хууль зүйн зөвлөгөө, хууль тогтоомжийн шинэчлэл.' };
export const revalidate = 60;

const CATEGORIES = ['', 'NEWS', 'ADVICE', 'LEGAL_UPDATE'] as const;
const PAGE_SIZE = 9;

type SearchParams = Promise<{ category?: string; page?: string; search?: string }>;

function buildHref(params: { category?: string; search?: string; page?: number }) {
  const qs = new URLSearchParams();
  if (params.category) qs.set('category', params.category);
  if (params.search) qs.set('search', params.search);
  if (params.page && params.page > 1) qs.set('page', String(params.page));
  const s = qs.toString();
  return s ? `/news?${s}` : '/news';
}

export default async function NewsPage({ searchParams }: { searchParams: SearchParams }) {
  const { category = '', page = '1', search = '' } = await searchParams;
  const currentPage = Math.max(1, Number(page) || 1);
  const query = new URLSearchParams({ page: String(currentPage), limit: String(PAGE_SIZE) });
  if (category) query.set('category', category);
  if (search) query.set('search', search);

  let data: Paginated<PostListItem> = { items: [], total: 0, page: 1, limit: PAGE_SIZE, totalPages: 1 };
  let failed = false;
  try {
    data = await apiFetch<Paginated<PostListItem>>(`/posts?${query}`, { next: { revalidate: 60 } });
  } catch {
    failed = true;
  }

  return (
    <>
      <PageHeader overline="Мэдээ ба нийтлэл" title="Мэдээ, зөвлөгөө, шинэчлэл" description="Фирмийн мэдээ, хуульчдын зөвлөгөө, хууль тогтоомжийн шинэчлэл." crumbs={[{ label: 'Нүүр', href: '/' }, { label: 'Мэдээ ба нийтлэл' }]} />
      <section className="mx-auto max-w-[1200px] px-4 py-12 md:px-6 md:py-16">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <nav aria-label="Ангилал" className="flex flex-wrap gap-2">
            {CATEGORIES.map((value) => {
              const active = category === value;
              return (
                <Link
                  key={value || 'all'}
                  href={buildHref({ category: value, search })}
                  aria-current={active ? 'page' : undefined}
                  className={cn('focus-ring inline-flex h-11 items-center rounded-full border px-5 text-body-sm-medium transition-colors', active ? 'border-brand-primary bg-brand-primary text-text-on-inverse' : 'border-border-default bg-bg-surface text-text-secondary hover:border-border-strong hover:text-text-brand')}
                >
                  {value ? CATEGORY_LABELS[value] : 'Бүгд'}
                </Link>
              );
            })}
          </nav>
          <NewsSearch category={category} initial={search} />
        </div>

        {search && (
          <p className="mt-6 text-body-sm text-text-muted">
            «{search}» хайлтын үр дүн: {data.total} нийтлэл · <Link href={buildHref({ category })} className="text-text-accent underline">Цэвэрлэх</Link>
          </p>
        )}

        {failed ? (
          <div className="mt-8"><EmptyState title="Мэдээ ачаалахад алдаа гарлаа" description="API ажиллаж байгаа эсэхийг шалгаад дахин оролдоно уу." /></div>
        ) : data.items.length === 0 ? (
          <div className="mt-8"><EmptyState title="Нийтлэл олдсонгүй" description="Өөр ангилал сонгох эсвэл хайлтаа өөрчилнө үү." /></div>
        ) : (
          <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {data.items.map((post) => (
              <NewsCard key={post.id} overline={CATEGORY_LABELS[post.category]} title={post.title} excerpt={post.excerpt} meta={`${formatDate(post.publishedAt)} · ${post.viewCount} үзсэн`} href={`/news/${post.slug}`} imageUrl={post.coverImageUrl} />
            ))}
          </div>
        )}

        <Pagination className="mt-12 justify-center" page={data.page} totalPages={data.totalPages} hrefFor={(p) => buildHref({ category, search, page: p })} />
      </section>
    </>
  );
}
