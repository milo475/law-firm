// Figma: Design System / Nav header (13:58, Type=Public 88px) + Nav header mobile (23:40, 64px)
'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { CloseIcon, MenuIcon } from '@/components/icons';
import { cn } from '@/lib/utils';
import { Button } from './button';
import { Logo } from './logo';

const PUBLIC_NAV = [
  { href: '/about', label: 'Бидний тухай' },
  { href: '/services', label: 'Үйлчилгээ' },
  { href: '/lawyers', label: 'Хуульчид' },
  { href: '/news', label: 'Мэдээ' },
  { href: '/faq', label: 'Түгээмэл асуулт' },
  { href: '/contact', label: 'Холбоо барих' },
];

export function NavHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="sticky top-0 z-40 border-b border-border-default bg-bg-surface">
      {/* Desktop — 1440 frame: 88px, 120px side padding (max 1200 content).
          The full row (logo + 6 links + two actions) only fits from 1280px, so narrower
          screens get the compact header with the drawer menu. */}
      <div className="mx-auto hidden h-[88px] max-w-[1200px] items-center justify-between gap-6 px-6 xl:flex">
        <Logo />
        <nav aria-label="Үндсэн цэс" className="flex items-center gap-5 xl:gap-7">
          {PUBLIC_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? 'page' : undefined}
              className={cn('focus-ring inline-flex h-11 items-center rounded-sm text-body transition-colors hover:text-text-brand', isActive(item.href) ? 'text-text-brand' : 'text-text-secondary')}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <Link href="/portal" className="focus-ring inline-flex h-11 items-center rounded-md px-4 text-body-medium text-text-brand hover:bg-bg-brand-soft">
            Портал
          </Link>
          <Button asChild size="md">
            <Link href="/contact">Зөвлөгөө авах</Link>
          </Button>
        </div>
      </div>

      {/* Mobile and tablet — 390 frame: 64px, logo scaled 0.8, 44px menu button */}
      <div className="flex h-16 items-center justify-between pl-4 pr-2 xl:hidden">
        <Logo scale={0.8} />
        <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
          <DialogPrimitive.Trigger asChild>
            <button type="button" className="focus-ring inline-flex size-11 items-center justify-center rounded-md text-text-brand" aria-label="Цэс нээх">
              <MenuIcon size={44} />
            </button>
          </DialogPrimitive.Trigger>
          <DialogPrimitive.Portal>
            <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[rgba(10,30,51,0.6)]" />
            <DialogPrimitive.Content className="fixed inset-y-0 right-0 z-50 flex w-[min(360px,100vw)] flex-col bg-bg-surface shadow-modal focus:outline-none">
              <DialogPrimitive.Title className="sr-only">Цэс</DialogPrimitive.Title>
              <DialogPrimitive.Description className="sr-only">Сайтын үндсэн цэс</DialogPrimitive.Description>
              <div className="flex h-16 items-center justify-between border-b border-border-default pl-4 pr-2">
                <Logo scale={0.8} href={null} />
                <DialogPrimitive.Close className="focus-ring inline-flex size-11 items-center justify-center rounded-md text-text-secondary" aria-label="Цэс хаах">
                  <CloseIcon size={44} />
                </DialogPrimitive.Close>
              </div>
              <nav aria-label="Гар утасны цэс" className="flex flex-col gap-1 p-4">
                {PUBLIC_NAV.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isActive(item.href) ? 'page' : undefined}
                    className={cn('focus-ring flex h-12 items-center rounded-md px-3 text-body-medium', isActive(item.href) ? 'bg-bg-brand-soft text-text-brand' : 'text-text-secondary hover:bg-bg-brand-soft')}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
              <div className="mt-auto flex flex-col gap-3 border-t border-border-default p-4">
                <Button asChild variant="secondary" size="md"><Link href="/portal">Портал</Link></Button>
                <Button asChild size="md"><Link href="/contact">Зөвлөгөө авах</Link></Button>
              </div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
      </div>
    </header>
  );
}
