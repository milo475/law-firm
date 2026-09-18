import type { MetadataRoute } from 'next';
import { SERVICES } from '@/content/services';
import { routing, BCP47, type Locale } from '@/i18n/routing';
import { apiFetch, type Paginated, type PostListItem } from '@/lib/api';
import { siteUrl } from '@/lib/seo';

const STATIC_PATHS = ['/', '/about', '/services', '/lawyers', '/reviews', '/news', '/faq', '/contact', '/privacy', '/terms'];

/** `/services` in the default locale, `/en/services` elsewhere. */
function localized(base: URL, locale: Locale, pathname: string): string {
  const prefix = locale === routing.defaultLocale ? '' : `/${locale}`;
  const path = pathname === '/' ? '' : pathname;
  return new URL(`${prefix}${path}` || '/', base).toString();
}

/** Every public page in all three languages, each linking to its alternates. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  let postPaths: string[] = [];
  try {
    const posts = await apiFetch<Paginated<PostListItem>>('/posts?limit=100', { next: { revalidate: 3600 } });
    postPaths = posts.items.map((post) => `/news/${post.slug}`);
  } catch {
    postPaths = [];
  }
  const paths = [...STATIC_PATHS, ...SERVICES.map((service) => `/services/${service.slug}`), ...postPaths];

  return paths.flatMap((pathname) =>
    routing.locales.map((locale) => ({
      url: localized(base, locale as Locale, pathname),
      changeFrequency: pathname.startsWith('/news/') ? ('monthly' as const) : ('weekly' as const),
      priority: pathname === '/' ? 1 : 0.7,
      alternates: {
        languages: Object.fromEntries(
          routing.locales.map((alt) => [BCP47[alt as Locale], localized(base, alt as Locale, pathname)]),
        ),
      },
    })),
  );
}
