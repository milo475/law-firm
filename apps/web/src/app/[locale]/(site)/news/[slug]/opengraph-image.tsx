// A shared article gets its own card with the headline on it, so the link reads as an article
// rather than as the site. The post's own cover image, when it has one, is set in generateMetadata.
import { ImageResponse } from 'next/og';
import { getTranslations } from 'next-intl/server';
import { BRAND, FIRM_NAME } from '@/lib/brand';
import { apiFetch, type PostDetail } from '@/lib/api';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = FIRM_NAME;

/** Long headlines shrink rather than overflow the card. */
const titleSize = (title: string) => (title.length > 90 ? 48 : title.length > 55 ? 58 : 68);

export default async function ArticleOpengraphImage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const [tCategory, post] = await Promise.all([
    getTranslations({ locale, namespace: 'enums.postCategory' }),
    apiFetch<PostDetail>(`/posts/${encodeURIComponent(slug)}`, { next: { revalidate: 60 } }).catch(() => null),
  ]);

  const overline = post ? tCategory(post.category) : FIRM_NAME;
  const title = post?.title ?? FIRM_NAME;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: BRAND.navy,
          padding: '72px 80px',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div style={{ display: 'flex', width: 56, height: 6, background: BRAND.gold }} />
          <div style={{ display: 'flex', fontSize: 26, letterSpacing: 2, color: BRAND.gold, textTransform: 'uppercase' }}>
            {overline}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            fontSize: titleSize(title),
            lineHeight: 1.25,
            fontWeight: 700,
            color: BRAND.surface,
            maxWidth: 1000,
          }}
        >
          {title}
        </div>

        <div style={{ display: 'flex', fontSize: 28, color: BRAND.onInverseMuted }}>{FIRM_NAME}</div>
      </div>
    ),
    size,
  );
}
