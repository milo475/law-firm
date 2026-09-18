// Figma: Design System / Nav header (13:58, Type=Public 88px) + Nav header mobile (23:40, 64px)
'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { CloseIcon, MenuIcon } from '@/components/icons';
import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { Button } from './button';
import { LanguageSwitcher } from './language-switcher';
import { Logo } from './logo';

const PUBLIC_NAV = ['about', 'services', 'lawyers', 'reviews', 'news', 'faq', 'contact'] as const;

export function NavHeader() {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="sticky top-0 z-40 border-b border-border-default bg-bg-surface">
      {/* Desktop — 1440 frame: 88px (Figma uses a 1200 content column; the row is allowed to run to
          1320 so the seven links, the language switcher and both actions fit without shrinking).
          Below 1280 the compact header with the drawer menu takes over. */}
      <div className="mx-auto hidden h-[88px] max-w-[1320px] items-center justify-between gap-4 px-6 xl:flex">
        <span className="shrink-0"><Logo /></span>
        <nav aria-label={t('menu')} className="flex items-center gap-2">
          {PUBLIC_NAV.map((item) => (
            <Link
              key={item}
              href={`/${item}`}
              aria-current={isActive(`/${item}`) ? 'page' : undefined}
              className={cn('focus-ring inline-flex h-11 items-center whitespace-nowrap rounded-sm text-body transition-colors hover:text-text-brand', isActive(`/${item}`) ? 'text-text-brand' : 'text-text-secondary')}
            >
              {t(item)}
            </Link>
          ))}
        </nav>
        <div className="flex shrink-0 items-center gap-2">
          <LanguageSwitcher />
          <Link href="/portal" className="focus-ring inline-flex h-11 items-center whitespace-nowrap rounded-md px-3 text-body-medium text-text-brand hover:bg-bg-brand-soft">
            {t('portal')}
          </Link>
          <Button asChild size="md">
            <Link href="/contact">{t('cta')}</Link>
          </Button>
        </div>
      </div>

      {/* Mobile and tablet — 390 frame: 64px, logo scaled 0.8, 44px menu button */}
      <div className="flex h-16 items-center justify-between pl-4 pr-2 xl:hidden">
        <Logo scale={0.8} />
        <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
          <DialogPrimitive.Trigger asChild>
            <button type="button" className="focus-ring inline-flex size-11 items-center justify-center rounded-md text-text-brand" aria-label={t('openMenu')}>
              <MenuIcon size={44} />
            </button>
          </DialogPrimitive.Trigger>
          <DialogPrimitive.Portal>
            <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[rgba(10,30,51,0.6)]" />
            <DialogPrimitive.Content className="fixed inset-y-0 right-0 z-50 flex w-[min(360px,100vw)] flex-col bg-bg-surface shadow-modal focus:outline-none">
              <DialogPrimitive.Title className="sr-only">{t('menuTitle')}</DialogPrimitive.Title>
              <DialogPrimitive.Description className="sr-only">{t('menuDescription')}</DialogPrimitive.Description>
              <div className="flex h-16 items-center justify-between border-b border-border-default pl-4 pr-2">
                <Logo scale={0.8} href={null} />
                <DialogPrimitive.Close className="focus-ring inline-flex size-11 items-center justify-center rounded-md text-text-secondary" aria-label={t('closeMenu')}>
                  <CloseIcon size={44} />
                </DialogPrimitive.Close>
              </div>
              <nav aria-label={t('mobileMenu')} className="flex flex-col gap-1 p-4">
                {PUBLIC_NAV.map((item) => (
                  <Link
                    key={item}
                    href={`/${item}`}
                    aria-current={isActive(`/${item}`) ? 'page' : undefined}
                    className={cn('focus-ring flex h-12 items-center rounded-md px-3 text-body-medium', isActive(`/${item}`) ? 'bg-bg-brand-soft text-text-brand' : 'text-text-secondary hover:bg-bg-brand-soft')}
                  >
                    {t(item)}
                  </Link>
                ))}
              </nav>
              <div className="mt-auto flex flex-col gap-3 border-t border-border-default p-4">
                <LanguageSwitcher variant="list" />
                <Button asChild variant="secondary" size="md"><Link href="/portal">{t('portal')}</Link></Button>
                <Button asChild size="md"><Link href="/contact">{t('cta')}</Link></Button>
              </div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
      </div>
    </header>
  );
}
