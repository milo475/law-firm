import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { NewsCard } from '@/components/ui/card';
import { ApiError, apiFetch, type Paginated, type PostDetail, type PostListItem } from '@/lib/api';
import { CATEGORY_LABELS, formatDate } from '@/lib/format';
import { shortName } from '@/lib/utils';

export const revalidate = 60;

type Params = { params: Promise<{ slug: string }> };

async function loadPost(slug: string): Promise<PostDetail | null> {
  try {
    return await apiFetch<PostDetail>(`/posts/${encodeURIComponent(slug)}`, { next: { revalidate: 60 } });
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

async function loadRelated(category: string, slug: string): Promise<PostListItem[]> {
  try {
    const data = await apiFetch<Paginated<PostListItem>>(`/posts?category=${category}&limit=4`, { next: { revalidate: 60 } });
    return data.items.filter((p) => p.slug !== slug).slice(0, 3);
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const post = await loadPost(slug);
  if (!post) return { title: 'Нийтлэл олдсонгүй' };
  return {
    title: post.title,
    description: post.excerpt,
    openGraph: { title: post.title, description: post.excerpt, type: 'article', publishedTime: post.publishedAt ?? undefined, images: post.coverImageUrl ? [post.coverImageUrl] : undefined },
  };
}

export default async function PostPage({ params }: Params) {
  const { slug } = await params;
  const post = await loadPost(slug);
  if (!post) notFound();
  const related = await loadRelated(post.category, slug);

  return (
    <>
      <section className="border-b border-border-default bg-bg-brand-soft">
        <div className="mx-auto flex max-w-[840px] flex-col gap-4 px-4 py-12 md:px-6 md:py-16">
          <Breadcrumb items={[{ label: 'Нүүр', href: '/' }, { label: 'Мэдээ ба нийтлэл', href: '/news' }, { label: post.title }]} />
          <p className="text-overline text-text-accent">{CATEGORY_LABELS[post.category]}</p>
          <h1 className="text-h2 md:text-h1">{post.title}</h1>
          <p className="text-body-sm text-text-muted">
            {formatDate(post.publishedAt)} · {shortName(post.author.firstName, post.author.lastName)} · {post.viewCount} үзсэн
          </p>
        </div>
      </section>
      <article className="mx-auto max-w-[840px] px-4 py-12 md:px-6 md:py-16">
        {post.coverImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.coverImageUrl} alt="" className="mb-8 w-full rounded-lg" />
        )}
        <p className="text-body-lg text-text-secondary">{post.excerpt}</p>
        <div className="prose-mn mt-8">
          <ReactMarkdown rehypePlugins={[rehypeSanitize]}>{post.content}</ReactMarkdown>
        </div>
      </article>
      {related.length > 0 && (
        <section className="border-t border-border-default bg-bg-surface">
          <div className="mx-auto max-w-[1200px] px-4 py-16 md:px-6">
            <div className="flex items-end justify-between gap-4">
              <h2 className="text-h3">Холбоотой нийтлэл</h2>
              <Link href={`/news?category=${post.category}`} className="focus-ring inline-flex h-11 items-center rounded-sm text-body-medium text-text-accent hover:underline">Бүгдийг харах →</Link>
            </div>
            <div className="mt-8 grid gap-6 md:grid-cols-3">
              {related.map((p) => (
                <NewsCard key={p.id} overline={CATEGORY_LABELS[p.category]} title={p.title} excerpt={p.excerpt} meta={`${formatDate(p.publishedAt)} · ${p.viewCount} үзсэн`} href={`/news/${p.slug}`} imageUrl={p.coverImageUrl} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
