import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/states';
import { apiFetch, type Paginated, type PostListItem } from '@/lib/api';
import { CATEGORY_LABELS, formatDate } from '@/lib/format';

export const metadata: Metadata = {
  title: 'Мэдээ, зөвлөгөө',
  description: 'Хуулийн фирмийн мэдээ, хууль зүйн зөвлөгөө, хууль тогтоомжийн шинэчлэл',
};
export const revalidate = 60;

const CATEGORIES = ['', 'NEWS', 'ADVICE', 'LEGAL_UPDATE'] as const;

type SearchParams = Promise<{ category?: string; page?: string; search?: string }>;

export default async function NewsPage({ searchParams }: { searchParams: SearchParams }) {
  const { category = '', page = '1', search = '' } = await searchParams;
  const query = new URLSearchParams({ page, limit: '9' });
  if (category) query.set('category', category);
  if (search) query.set('search', search);

  let data: Paginated<PostListItem> = { items: [], total: 0, page: 1, limit: 9, totalPages: 1 };
  let failed = false;
  try {
    data = await apiFetch<Paginated<PostListItem>>(`/posts?${query.toString()}`, { next: { revalidate: 60 } });
  } catch {
    failed = true;
  }

  const linkFor = (overrides: Record<string, string>) => {
    const params = new URLSearchParams({ category, search, ...overrides });
    for (const [key, value] of [...params.entries()]) if (!value) params.delete(key);
    const qs = params.toString();
    return qs ? `/news?${qs}` : '/news';
  };

  return (
    <>
      <PageHeader eyebrow="Мэдээ" title="Мэдээ, зөвлөгөө" description="Фирмийн мэдээ, хуульчдын зөвлөгөө, хууль тогтоомжийн шинэчлэл." />
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <nav className="flex flex-wrap gap-2" aria-label="Ангилал">
            {CATEGORIES.map((value) => (
              <Link
                key={value || 'all'}
                href={linkFor({ category: value, page: '' })}
                className={`rounded-full border px-4 py-1.5 text-sm ${
                  category === value ? 'border-brand-900 bg-brand-900 text-white' : 'border-brand-100 text-slate-600 hover:border-brand-300'
                }`}
              >
                {value ? CATEGORY_LABELS[value] : 'Бүгд'}
              </Link>
            ))}
          </nav>
          <form action="/news" className="flex gap-2">
            {category && <input type="hidden" name="category" value={category} />}
            <input
              type="search"
              name="search"
              defaultValue={search}
              placeholder="Хайх…"
              className="rounded-md border border-brand-100 px-3 py-1.5 text-sm"
            />
            <button type="submit" className="rounded-md bg-brand-900 px-4 py-1.5 text-sm text-white">Хайх</button>
          </form>
        </div>

        {failed ? (
          <EmptyState message="Мэдээ ачаалахад алдаа гарлаа. API ажиллаж байгаа эсэхийг шалгана уу." />
        ) : data.items.length === 0 ? (
          <div className="mt-8"><EmptyState message="Нийтлэл олдсонгүй." /></div>
        ) : (
          <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {data.items.map((post) => (
              <article key={post.id} className="flex flex-col rounded-lg border border-brand-100 p-6">
                <p className="text-xs font-semibold uppercase tracking-wide text-accent-600">{CATEGORY_LABELS[post.category]}</p>
                <h2 className="mt-2 text-lg">
                  <Link href={`/news/${post.slug}`} className="hover:text-brand-500">{post.title}</Link>
                </h2>
                <p className="mt-2 line-clamp-3 text-sm text-slate-600">{post.excerpt}</p>
                <p className="mt-auto pt-4 text-xs text-slate-500">
                  {formatDate(post.publishedAt)} · {post.author.lastName.charAt(0)}. {post.author.firstName} · {post.viewCount} үзсэн
                </p>
              </article>
            ))}
          </div>
        )}

        {data.totalPages > 1 && (
          <nav className="mt-10 flex items-center justify-center gap-2" aria-label="Хуудаслалт">
            {Array.from({ length: data.totalPages }, (_, i) => i + 1).map((n) => (
              <Link
                key={n}
                href={linkFor({ page: String(n) })}
                className={`rounded-md border px-3 py-1.5 text-sm ${n === data.page ? 'border-brand-900 bg-brand-900 text-white' : 'border-brand-100 text-slate-600'}`}
                aria-current={n === data.page ? 'page' : undefined}
              >
                {n}
              </Link>
            ))}
          </nav>
        )}
      </div>
    </>
  );
}
