// Figma: 01 Public Site / Public / 07 News / Desktop (20:655) + Mobile (25:1517)
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ImagePlaceholder, NewsCard } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Pagination } from '@/components/ui/pagination';
import { EmptyState } from '@/components/ui/states';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { apiFetch, type Paginated, type PostListItem } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { alternateLanguages } from '@/lib/seo';
import { cn, shortName } from '@/lib/utils';
import { NewsSearch } from './news-search';
import { buildNewsHref, NEWS_CATEGORIES } from './news-utils';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'news' });
  return { title: t('metaTitle'), description: t('metaDescription'), alternates: { languages: alternateLanguages('/news') } };
}
export const revalidate = 60;

// Figma page = 1 featured article + 6 cards (3×2) → 7 posts per page.
const PAGE_SIZE = 7;
const CHIPS = ['', ...NEWS_CATEGORIES] as const;

type SearchParams = Promise<{ category?: string; page?: string; search?: string }>;

function postMeta(post: PostListItem, locale: Locale, views: (count: number) => string) {
  return `${formatDate(post.publishedAt, locale)} · ${views(post.viewCount)}`;
}

/** Figma "Featured" (20:704): bg-page tile, 480×300 image, overline "ОНЦЛОХ · <category>", H3 title. Desktop only. */
async function FeaturedPost({ post, locale }: { post: PostListItem; locale: Locale }) {
  const [t, tCommon, tCategory] = await Promise.all([getTranslations('news'), getTranslations('common'), getTranslations('enums.postCategory')]);
  const href = `/news/${post.slug}`;
  return (
    <article className="hidden gap-10 rounded-lg bg-bg-page p-8 lg:flex lg:items-center">
      <Link href={href} className="focus-ring block w-[480px] shrink-0 overflow-hidden rounded-lg" aria-label={post.title} tabIndex={-1}>
        <ImagePlaceholder src={post.coverImageUrl} className="h-[300px]" markSize={56} />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <p className="text-overline text-text-accent">{t('featured')} · {tCategory(post.category)}</p>
        <h2 className="max-w-[560px] text-h3">
          <Link href={href} className="focus-ring rounded-sm hover:text-text-brand">{post.title}</Link>
        </h2>
        <p className="max-w-[560px] text-body text-text-secondary">{post.excerpt}</p>
        <p className="text-caption text-text-muted">{shortName(post.author.firstName, post.author.lastName)} · {postMeta(post, locale, (count) => tCommon('views', { count }))}</p>
      </div>
    </article>
  );
}

export default async function NewsPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: SearchParams }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, tCommon, tCategory] = await Promise.all([getTranslations('news'), getTranslations('common'), getTranslations('enums.postCategory')]);
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
      <PageHeader
        title={t('title')}
        description={t('description')}
        crumbs={[{ label: tCommon('home'), href: '/' }, { label: t('crumb'), href: '/news' }, { label: t('crumbAll') }]}
      />

      <section className="bg-bg-surface">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-5 py-14 md:gap-10 md:px-6 md:py-24">
          {/* Toolbar — Figma 20:691: filter chips left, 320px search right; mobile stacks search above the chips */}
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="md:order-last">
              <NewsSearch category={category} initial={search} />
            </div>
            <nav aria-label={t('categoryLabel')} className="flex flex-wrap gap-2.5">
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
                    {value ? tCategory(value) : tCommon('all')}
                  </Link>
                );
              })}
            </nav>
          </div>

          {search && (
            <p className="text-body-sm text-text-muted">
              {t('searchResult', { query: search, count: data.total })} · <Link href={buildNewsHref({ category })} className="focus-ring rounded-sm text-text-accent underline">{t('clearSearch')}</Link>
            </p>
          )}

          <p className="text-body-sm text-text-muted">{t('mongolianNote')}</p>

          {failed ? (
            <EmptyState title={t('failedTitle')} description={t('failedDescription')} />
          ) : data.items.length === 0 ? (
            <EmptyState title={t('noneTitle')} description={t('noneDescription')} />
          ) : (
            <>
              {featured && <FeaturedPost post={featured} locale={locale as Locale} />}
              <div className="grid gap-6 md:grid-cols-2 md:gap-8 lg:grid-cols-3">
                {data.items.map((post) => (
                  <NewsCard
                    key={post.id}
                    overline={tCategory(post.category)}
                    title={post.title}
                    excerpt={post.excerpt}
                    meta={postMeta(post, locale as Locale, (count) => tCommon('views', { count }))}
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
