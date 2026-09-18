'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { CloseIcon } from '@/components/icons';
import { usePathname, useRouter } from '@/i18n/navigation';
import { LOCALE_LABELS, type Locale } from '@/i18n/routing';

const YEAR = 60 * 60 * 24 * 365;

/**
 * Offers the visitor's own language once, without redirecting: the server decides from
 * Accept-Language whether to render this, and either button writes NEXT_LOCALE so the bar
 * does not come back.
 */
export function LocaleSuggestion({ suggested }: { suggested: Locale }) {
  const t = useTranslations('site');
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);
  if (dismissed || suggested === locale) return null;

  const remember = (value: Locale) => {
    document.cookie = `NEXT_LOCALE=${value}; path=/; max-age=${YEAR}; samesite=lax`;
  };

  return (
    <div className="border-b border-border-default bg-bg-brand-soft">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-3 px-5 py-2 md:px-6">
        <button
          type="button"
          lang={suggested}
          onClick={() => {
            remember(suggested);
            router.replace(pathname, { locale: suggested });
          }}
          className="focus-ring rounded-sm text-body-sm-medium text-text-brand underline-offset-2 hover:underline"
        >
          {LOCALE_LABELS[suggested].name} →
        </button>
        <button
          type="button"
          aria-label={t('dismissSuggestion')}
          onClick={() => {
            remember(locale);
            setDismissed(true);
          }}
          className="focus-ring inline-flex size-8 items-center justify-center rounded-md text-text-secondary hover:bg-bg-surface"
        >
          <CloseIcon size={20} />
        </button>
      </div>
    </div>
  );
}
