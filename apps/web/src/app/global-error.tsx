// Last-resort boundary: a React render error above the locale layout. It renders its own document,
// so the text stays Mongolian (the default language) rather than reaching for translations.
'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="mn">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#ffffff', color: '#0f2a44' }}>
        <main style={{ maxWidth: 560, margin: '0 auto', padding: '96px 24px', textAlign: 'center' }}>
          <h1 style={{ fontSize: 28, marginBottom: 12 }}>Алдаа гарлаа</h1>
          <p style={{ fontSize: 16, lineHeight: 1.6, color: '#4a5a6a', marginBottom: 28 }}>
            Хуудсыг ачаалахад алдаа гарлаа. Дахин оролдоно уу.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{ padding: '12px 24px', fontSize: 16, color: '#ffffff', background: '#0f2a44', border: 0, borderRadius: 8, cursor: 'pointer' }}
          >
            Дахин оролдох
          </button>
        </main>
      </body>
    </html>
  );
}
