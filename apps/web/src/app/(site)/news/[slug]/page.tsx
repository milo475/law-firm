import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import { ApiError, apiFetch, type PostDetail } from '@/lib/api';
import { CATEGORY_LABELS, formatDate } from '@/lib/format';

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

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const post = await loadPost(slug);
  if (!post) return { title: 'Нийтлэл олдсонгүй' };
  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: 'article',
      publishedTime: post.publishedAt ?? undefined,
      images: post.coverImageUrl ? [post.coverImageUrl] : undefined,
    },
  };
}

export default async function PostPage({ params }: Params) {
  const { slug } = await params;
  const post = await loadPost(slug);
  if (!post) notFound();

  return (
    <article className="mx-auto max-w-3xl px-4 py-12">
      <Link href="/news" className="text-sm text-brand-500 hover:underline">← Бүх мэдээ</Link>
      <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-accent-600">{CATEGORY_LABELS[post.category]}</p>
      <h1 className="mt-2 text-3xl md:text-4xl">{post.title}</h1>
      <p className="mt-3 text-sm text-slate-500">
        {formatDate(post.publishedAt)} · {post.author.lastName.charAt(0)}. {post.author.firstName} · {post.viewCount} үзсэн
      </p>
      {post.coverImageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={post.coverImageUrl} alt="" className="mt-6 w-full rounded-lg" />
      )}
      <p className="mt-6 text-lg text-slate-700">{post.excerpt}</p>
      <div className="prose-mn mt-6 text-slate-700">
        <ReactMarkdown>{post.content}</ReactMarkdown>
      </div>
    </article>
  );
}
