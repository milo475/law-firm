// The card Facebook and Messenger show when a link to the site is shared — the firm's main channel,
// so a link with no image looks like a broken one. Rendered per language from the same messages.
import { ImageResponse } from 'next/og';
import { getTranslations } from 'next-intl/server';
import { BRAND, FIRM_NAME } from '@/lib/brand';
import { routing } from '@/i18n/routing';
import { siteUrl } from '@/lib/seo';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = FIRM_NAME;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function OpengraphImage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'site' });
  // The deployed host, never a domain we assumed; blank locally so the card carries no fake address.
  const host = siteUrl().hostname;
  const domain = host === 'localhost' || host === '127.0.0.1' ? '' : host.replace(/^www\./, '');

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
          // The system fallback covers Cyrillic; loading a webfont here would slow every share.
          fontFamily: 'sans-serif',
        }}
      >
        {/* Gold rule, as on the site's inverse bands */}
        <div style={{ display: 'flex', width: 120, height: 8, background: BRAND.gold }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          <div style={{ display: 'flex', fontSize: 78, fontWeight: 700, color: BRAND.surface, letterSpacing: -1 }}>
            {FIRM_NAME}
          </div>
          <div style={{ display: 'flex', fontSize: 34, lineHeight: 1.35, color: BRAND.onInverseMuted, maxWidth: 900 }}>
            {t('description')}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ display: 'flex', width: 14, height: 14, borderRadius: 7, background: BRAND.gold }} />
          <div style={{ display: 'flex', fontSize: 26, color: BRAND.onInverseMuted }}>{domain}</div>
        </div>
      </div>
    ),
    size,
  );
}
