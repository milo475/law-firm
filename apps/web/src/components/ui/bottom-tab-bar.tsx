// Figma: Design System / Bottom tab bar (23:41, 390) — 5 tabs, 76px, active = text-brand
'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';

export interface BottomTab {
  href: string;
  label: string;
  icon: React.ReactNode;
  active?: boolean;
}

export function BottomTabBar({ tabs, className }: { tabs: BottomTab[]; className?: string }) {
  return (
    <nav
      aria-label="Порталын доод цэс"
      className={cn('fixed inset-x-0 bottom-0 z-40 flex h-[76px] items-center border-t border-border-default bg-bg-surface pb-3 pt-2 md:hidden', className)}
      style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
    >
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          aria-current={tab.active ? 'page' : undefined}
          className={cn('focus-ring flex h-14 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-md text-caption', tab.active ? 'text-text-brand' : 'text-text-muted')}
        >
          <span className="h-[22px] w-6">{tab.icon}</span>
          <span className="truncate">{tab.label}</span>
        </Link>
      ))}
    </nav>
  );
}
