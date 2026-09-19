// Figma: 01 Public Site / Public / 08 Article Detail / Desktop (21:689) + Mobile (25:1618)
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import ReactMarkdown, { type Components } from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import { Avatar } from '@/components/ui/avatar';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { ImagePlaceholder, NewsCard } from '@/components/ui/card';
import { ApiError, apiFetch, type Paginated, type PostDetail, type PostListItem } from '@/lib/api';
import { Link as LocaleLink } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { formatDate, formatDateLong, ROLE_LABELS } from '@/lib/format';
import { initials, shortName } from '@/lib/utils';
import { readingMinutes } from '../news-utils';
import { ArticleShare } from './article-share';

export const revalidate = 60;

type Params = { params: Promise<{ locale: string; slug: string }> };

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
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: 'article',
      publishedTime: post.publishedAt ?? undefined,
      // With a cover, share that; with none, leave `images` unset so Next falls back to
      // opengraph-image.tsx, which draws the headline. Setting it to undefined suppresses both.
      ...(post.coverImageUrl ? { images: [post.coverImageUrl] } : {}),
    },
  };
}

/**
 * Markdown → Figma article typography (21:730 / 25:1639):
 * H2 36/44, H3 28/36, paragraphs Body/Large secondary, gold-dot bullets, gold left-rule quote in serif 24/36 text-brand.
 * Mobile: H2 26/34 → text-h3, H3 20/28 → text-h4, paragraphs Body/Base.
 */
const markdownComponents: Components = {
  h1: ({ children }) => <h2 className="text-h3 md:text-h2">{children}</h2>,
  h2: ({ children }) => <h2 className="text-h3 md:text-h2">{children}</h2>,
  h3: ({ children }) => <h3 className="text-h4 md:text-h3">{children}</h3>,
  h4: ({ children }) => <h4 className="text-h4">{children}</h4>,
  p: ({ children }) => <p className="text-body text-text-secondary md:text-body-lg">{children}</p>,
  ul: ({ children }) => <ul className="flex flex-col gap-2.5">{children}</ul>,
  ol: ({ children }) => <ol className="flex list-decimal flex-col gap-2.5 pl-6 text-body text-text-secondary md:text-body-lg">{children}</ol>,
  li: ({ children }) => (
    <li className="relative pl-4 text-body text-text-secondary before:absolute before:left-0 before:top-[10px] before:size-1.5 before:rounded-[3px] before:bg-accent-default before:content-[''] md:pl-[18px] md:text-body-lg md:before:top-3 [ol>&]:pl-0 [ol>&]:before:hidden [&>p]:inline">
      {children}
    </li>
  ),
  blockquote: ({ children }) => (
    <blockquote className="flex flex-col gap-2.5 border-l-4 border-accent-default py-1.5 pl-5 md:gap-3 md:py-2 md:pl-8 [&>p]:font-serif [&>p]:text-[20px] [&>p]:leading-[30px] [&>p]:text-text-brand md:[&>p]:text-[24px] md:[&>p]:leading-[36px] [&>p+p]:font-sans [&>p+p]:text-caption [&>p+p]:text-text-muted md:[&>p+p]:text-body-sm-medium">
      {children}
    </blockquote>
  ),
  a: ({ children, href }) => <a href={href} className="focus-ring rounded-sm text-text-accent underline">{children}</a>,
  strong: ({ children }) => <strong className="font-semibold text-text-primary">{children}</strong>,
  img: ({ src, alt }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={typeof src === 'string' ? src : undefined} alt={alt ?? ''} className="w-full rounded-lg" />
  ),
  hr: () => <hr className="border-border-default" />,
};

export default async function PostPage({ params }: Params) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const [t, tCommon, tCategory, post] = await Promise.all([
    getTranslations('news'),
    getTranslations('common'),
    getTranslations('enums.postCategory'),
    loadPost(slug),
  ]);
  if (!post) notFound();
  const related = await loadRelated(post.category, slug);

  const author = shortName(post.author.firstName, post.author.lastName);
  const minutes = readingMinutes(post.content);
  const categoryLabel = tCategory(post.category);
  const tag = `#${categoryLabel.toLowerCase().replace(/\s+/g, '_')}`;

  return (
    <>
      {/* Article header — Figma 21:715 (bg-page, 800px column, py-64) / 25:1629 (px-20 py-32) */}
      <header className="bg-bg-page">
        <div className="mx-auto flex max-w-[848px] flex-col gap-3 px-5 py-8 md:gap-5 md:px-6 md:py-16">
          <Breadcrumb items={[{ label: tCommon('home'), href: '/' }, { label: t('crumbShort'), href: '/news' }, { label: post.title }]} className="[&_li:last-child>span]:line-clamp-1" />
          <p className="text-overline text-text-accent">{categoryLabel}</p>
          <h1 className="text-h2 text-text-brand md:text-h1">{post.title}</h1>
          <div className="flex items-center gap-3 pt-1 md:gap-4 md:pt-2">
            <Avatar size="md" initials={initials(post.author.firstName, post.author.lastName)} src={post.author.avatarUrl} className="size-10 text-caption md:size-12 md:text-body-medium" />
            <div className="flex flex-col gap-0.5">
              <p className="text-body-sm-medium text-text-primary md:text-body-medium">{author}</p>
              <p className="text-caption text-text-muted md:text-body-sm md:font-normal">
                <span className="hidden md:inline">{ROLE_LABELS[post.author.role]} · {formatDateLong(post.publishedAt, locale as Locale)}</span>
                <span className="md:hidden">{formatDate(post.publishedAt, locale as Locale)}</span>
                {' · '}{t('readingTime', { minutes })}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Article body — Figma 21:730 (bg-surface, 800px column, py-80, gap-32) / 25:1639 (py-40, gap-20) */}
      <article className="bg-bg-surface">
        <div className="mx-auto flex max-w-[848px] flex-col gap-5 px-5 py-10 md:gap-8 md:px-6 md:py-20">
          <ImagePlaceholder src={post.coverImageUrl} className="h-[200px] rounded-lg md:h-[420px]" markSize={56} />
          <p className="text-body-lg text-text-primary">{post.excerpt}</p>
          <ReactMarkdown rehypePlugins={[rehypeSanitize]} components={markdownComponents}>{post.content}</ReactMarkdown>

          {/* Tags — Figma 21:760: pill chips; only the category is available from the API */}
          <div className="flex flex-wrap gap-2 md:gap-2.5 md:pt-4">
            <LocaleLink href={`/news?category=${post.category}`} className="focus-ring inline-flex items-center rounded-full border border-border-default bg-bg-page px-3 py-1.5 text-caption text-text-secondary transition-colors hover:border-border-strong hover:text-text-brand md:px-3.5 md:py-[7px]">
              {tag}
            </LocaleLink>
          </div>

          <div className="md:pt-4">
            <ArticleShare title={post.title} />
          </div>
        </div>
      </article>

      {/* Related — Figma 21:775 (bg-page, py-96, H2 + 3 cards) / 25:1679 (py-56, stacked) */}
      {related.length > 0 && (
        <section className="bg-bg-page" aria-labelledby="related-heading">
          <div className="mx-auto flex max-w-[1200px] flex-col gap-5 px-5 py-14 md:gap-8 md:px-6 md:py-24">
            <h2 id="related-heading" className="text-h3 md:text-h2">{t('related')}</h2>
            <div className="grid gap-5 md:grid-cols-3 md:gap-8">
              {related.map((p) => (
                <NewsCard
                  key={p.id}
                  overline={tCategory(p.category)}
                  title={p.title}
                  excerpt={p.excerpt}
                  meta={`${formatDate(p.publishedAt, locale as Locale)} · ${tCommon('views', { count: p.viewCount })}`}
                  href={`/news/${p.slug}`}
                  imageUrl={p.coverImageUrl}
                />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
