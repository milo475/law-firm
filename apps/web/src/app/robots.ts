import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/seo';

/**
 * Signed-in areas have no business in a search index: /portal is a client's own case data and
 * /admin is the firm's. They are behind a session anyway — this keeps them out of crawl queues and
 * out of "site:" listings that would advertise their existence.
 */
export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/portal', '/portal/', '/admin', '/admin/', '/api/'],
      },
    ],
    sitemap: new URL('/sitemap.xml', base).toString(),
    host: base.origin,
  };
}
