// Figma: Design System / Portal sidebar (27:29, 260px) + Sidebar nav item (10:58) — Default / Hover / Active
'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Avatar } from './avatar';
import { Logo } from './logo';

interface SidebarItemProps {
  href: string;
  label: string;
  icon: React.ReactNode;
  active?: boolean;
  count?: number;
  /** Screen-reader noun for the count badge (default: "уншаагүй"). */
  countLabel?: string;
  onClick?: () => void;
}

function SidebarItem({ href, label, icon, active, count, countLabel = 'уншаагүй' }: SidebarItemProps) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'focus-ring group flex h-12 w-full items-center gap-3 rounded-md px-3.5 text-body-medium transition-colors',
        active ? 'bg-bg-inverse-strong text-text-on-inverse' : 'text-text-on-inverse-muted hover:bg-navy-700 hover:text-text-on-inverse',
      )}
    >
      {/* icon: muted → white on hover → gold when active */}
      <span className={cn('size-5 shrink-0', active ? 'text-accent-default' : 'text-text-on-inverse-muted group-hover:text-text-on-inverse')}>{icon}</span>
      <span className="flex-1 truncate">{label}</span>
      {typeof count === 'number' && count > 0 && (
        <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-accent-default px-2 py-[3px] text-caption text-text-on-accent" aria-label={`${count} ${countLabel}`}>
          {count}
        </span>
      )}
    </Link>
  );
}

export interface SidebarProps {
  items: SidebarItemProps[];
  user: { firstName: string; lastName: string; roleLabel: string; avatarUrl?: string | null };
  onLogout: () => void;
  logoutIcon: React.ReactNode;
  /** Screen-reader name of the nav; the admin panel keeps the Mongolian default. */
  menuLabel?: string;
  className?: string;
}

export function Sidebar({ items, user, onLogout, logoutIcon, menuLabel = 'Порталын цэс', className }: SidebarProps) {
  return (
    <aside className={cn('flex h-full w-[260px] shrink-0 flex-col gap-8 bg-bg-inverse px-4 py-6', className)}>
      <div className="pl-2">
        <Logo theme="dark" href="/portal" variant="lockup" scale={0.85} />
      </div>
      <nav aria-label={menuLabel} className="flex flex-col gap-1">
        {items.map((item) => <SidebarItem key={item.href} {...item} />)}
      </nav>
      <div className="mt-auto flex flex-col gap-2">
        <div className="h-px w-full bg-border-inverse" />
        <div className="flex h-14 items-center gap-3 px-3.5">
          <Avatar size="sm" tone="accent" initials={`${user.lastName.charAt(0)}${user.firstName.charAt(0)}`.toUpperCase()} src={user.avatarUrl} className="size-9" />
          <div className="flex min-w-0 flex-col gap-0.5">
            <p className="truncate text-body-sm-medium text-text-on-inverse">{user.lastName.charAt(0)}. {user.firstName}</p>
            <p className="text-caption text-text-on-inverse-muted">{user.roleLabel}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="focus-ring group flex h-12 w-full items-center gap-3 rounded-md px-3.5 text-body-medium text-text-on-inverse-muted transition-colors hover:bg-navy-700 hover:text-text-on-inverse"
        >
          <span className="size-5 shrink-0">{logoutIcon}</span>
          Гарах
        </button>
      </div>
    </aside>
  );
}
