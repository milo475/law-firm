// Figma: 01 Public Site / Public / 07 News / Desktop (20:655) + Mobile (25:1517)
import type { Metadata } from 'next';
import Link from 'next/link';
import { ImagePlaceholder, NewsCard } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Pagination } from '@/components/ui/pagination';
import { EmptyState } from '@/components/ui/states';
import { apiFetch, type Paginated, type PostListItem } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { cn, shortName } from '@/lib/utils';
import { NewsSearch } from './news-search';
import { buildNewsHref, NEWS_CATEGORIES, NEWS_CATEGORY_LABELS } from './news-utils';

export const metadata: Metadata = { title: 'Мэдээ ба нийтлэл', description: 'Хуулийн шинэчлэл, практик зөвлөгөө, фирмийн мэдээллийг энд нийтэлнэ.' };
export const revalidate = 60;

// Figma page = 1 featured article + 6 cards (3×2) → 7 posts per page.
const PAGE_SIZE = 7;
const CHIPS = ['', ...NEWS_CATEGORIES] as const;

type SearchParams = Promise<{ category?: string; page?: string; search?: string }>;

function postMeta(post: PostListItem) {
  return `${formatDate(post.publishedAt)} · ${post.viewCount} үзсэн`;
}

/** Figma "Featured" (20:704): bg-page tile, 480×300 image, overline "ОНЦЛОХ · <category>", H3 title. Desktop only. */
function FeaturedPost({ post }: { post: PostListItem }) {
  const href = `/news/${post.slug}`;
  return (
    <article className="hidden gap-10 rounded-lg bg-bg-page p-8 lg:flex lg:items-center">
      <Link href={href} className="focus-ring block w-[480px] shrink-0 overflow-hidden rounded-lg" aria-label={post.title} tabIndex={-1}>
        <ImagePlaceholder src={post.coverImageUrl} className="h-[300px]" markSize={56} />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <p className="text-overline text-text-accent">Онцлох · {NEWS_CATEGORY_LABELS[post.category]}</p>
        <h2 className="max-w-[560px] text-h3">
          <Link href={href} className="focus-ring rounded-sm hover:text-text-brand">{post.title}</Link>
        </h2>
        <p className="max-w-[560px] text-body text-text-secondary">{post.excerpt}</p>
        <p className="text-caption text-text-muted">{shortName(post.author.firstName, post.author.lastName)} · {postMeta(post)}</p>
      </div>
    </article>
  );
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

  // The first post of a (non-search) page is shown as the featured tile on desktop; on mobile it is a normal card.
  const featured = !search && data.items.length > 0 ? data.items[0] : null;

  return (
    <>
      <PageHeader title="Мэдээ ба нийтлэл" description="Хуулийн шинэчлэл, практик зөвлөгөө, фирмийн мэдээллийг энд нийтэлнэ." crumbs={[{ label: 'Нүүр', href: '/' }, { label: 'Мэдээ ба нийтлэл', href: '/news' }, { label: 'Бүх нийтлэл' }]} />

      <section className="bg-bg-surface">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-5 py-14 md:gap-10 md:px-6 md:py-24">
          {/* Toolbar — Figma 20:691: filter chips left, 320px search right; mobile stacks search above the chips */}
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="md:order-last">
              <NewsSearch category={category} initial={search} />
            </div>
            <nav aria-label="Ангилал" className="flex flex-wrap gap-2.5">
              {CHIPS.map((value) => {
                const active = category === value;
                return (
                  <Link
                    key={value || 'all'}
                    href={buildNewsHref({ category: value, search })}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'focus-ring inline-flex h-11 items-center rounded-full px-4 text-body-sm-medium transition-colors md:px-5',
                      active ? 'bg-brand-primary text-text-on-inverse' : 'border border-border-default bg-bg-surface text-text-secondary hover:border-border-strong hover:text-text-brand',
                    )}
                  >
                    {value ? NEWS_CATEGORY_LABELS[value] : 'Бүгд'}
                  </Link>
                );
              })}
            </nav>
          </div>

          {search && (
            <p className="text-body-sm text-text-muted">
              «{search}» хайлтын үр дүн: {data.total} нийтлэл · <Link href={buildNewsHref({ category })} className="focus-ring rounded-sm text-text-accent underline">Цэвэрлэх</Link>
            </p>
          )}

          {failed ? (
            <EmptyState title="Мэдээ ачаалахад алдаа гарлаа" description="API ажиллаж байгаа эсэхийг шалгаад дахин оролдоно уу." />
          ) : data.items.length === 0 ? (
            <EmptyState title="Нийтлэл олдсонгүй" description="Өөр ангилал сонгох эсвэл хайлтаа өөрчилнө үү." />
          ) : (
            <>
              {featured && <FeaturedPost post={featured} />}
              <div className="grid gap-6 md:grid-cols-2 md:gap-8 lg:grid-cols-3">
                {data.items.map((post) => (
                  <NewsCard
                    key={post.id}
                    overline={NEWS_CATEGORY_LABELS[post.category]}
                    title={post.title}
                    excerpt={post.excerpt}
                    meta={postMeta(post)}
                    href={`/news/${post.slug}`}
                    imageUrl={post.coverImageUrl}
                    className={cn(post === featured && 'lg:hidden')}
                  />
                ))}
              </div>
            </>
          )}

          <Pagination className="justify-center" page={data.page} totalPages={data.totalPages} hrefFor={(p) => buildNewsHref({ category, search, page: p })} />
        </div>
      </section>
    </>
  );
}
