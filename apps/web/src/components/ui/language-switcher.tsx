'use client';

import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useLocale, useTranslations } from 'next-intl';
import { useTransition } from 'react';
import { usePathname, useRouter } from '@/i18n/navigation';
import { LOCALE_LABELS, routing, type Locale } from '@/i18n/routing';
import { cn } from '@/lib/utils';

/**
 * Switches language and remembers the choice in the NEXT_LOCALE cookie, so a reload (or the next
 * visit) stays in the chosen language. Nothing redirects on its own — this is the only thing that
 * changes the language.
 */
export function LanguageSwitcher({ className, variant = 'compact' }: { className?: string; variant?: 'compact' | 'list' }) {
  const t = useTranslations('site');
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const select = (next: Locale) => {
    document.cookie = `NEXT_LOCALE=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    startTransition(() => {
      router.replace(pathname, { locale: next });
      router.refresh();
    });
  };

  if (variant === 'list') {
    return (
      <div className={cn('flex gap-2', className)} role="group" aria-label={t('languageLabel')}>
        {routing.locales.map((item) => (
          <button
            key={item}
            type="button"
            lang={item}
            onClick={() => select(item as Locale)}
            aria-current={item === locale ? 'true' : undefined}
            className={cn(
              'focus-ring h-11 flex-1 rounded-md border text-body-sm-medium transition-colors',
              item === locale ? 'border-border-brand bg-bg-brand-soft text-text-brand' : 'border-border-default text-text-secondary hover:bg-bg-brand-soft',
            )}
          >
            {LOCALE_LABELS[item as Locale].name}
          </button>
        ))}
      </div>
    );
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          disabled={pending}
          aria-label={t('languageLabel')}
          className={cn('focus-ring inline-flex h-11 items-center gap-1 rounded-md px-2 text-body-sm-medium text-text-secondary hover:bg-bg-brand-soft', className)}
        >
          {LOCALE_LABELS[locale].short}
          <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden className="shrink-0">
            <path d="M3 4.5L6 7.5L9 4.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={6} className="z-50 min-w-[160px] rounded-md border border-border-default bg-bg-surface p-1 shadow-menu">
          {routing.locales.map((item) => (
            <DropdownMenu.Item
              key={item}
              lang={item}
              onSelect={() => select(item as Locale)}
              className={cn(
                'focus-ring flex h-11 cursor-pointer items-center rounded-sm px-3 text-body-sm outline-none',
                item === locale ? 'bg-bg-brand-soft text-text-brand' : 'text-text-secondary hover:bg-bg-brand-soft',
              )}
            >
              {LOCALE_LABELS[item as Locale].name}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
