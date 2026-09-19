// Figma: Design System / Nav header (13:45, Type=Portal 72px) + Nav header mobile (23:29, Type=Portal 64px)
'use client';

import Link from 'next/link';
import { BackIcon, NotificationsIcon, SearchIcon } from '@/components/icons';
import { cn } from '@/lib/utils';
import { Avatar } from './avatar';

export interface PortalHeaderProps {
  title: string;
  user: { firstName: string; lastName: string; avatarUrl?: string | null };
  unreadCount?: number;
  backHref?: string | null;
  onSearch?: (query: string) => void;
  /** Bell link target; null hides the bell. */
  notificationsHref?: string | null;
  /** Replaces the bell link with a custom control (the admin notification dropdown). */
  bellSlot?: React.ReactNode;
  profileHref?: string;
  searchPlaceholder?: string;
  /** Icon-button labels; the admin panel keeps the Mongolian defaults. */
  labels?: { back?: string; profile?: string };
  className?: string;
}

export function PortalHeader({ title, user, unreadCount = 0, backHref, onSearch, notificationsHref = '/portal/notifications', bellSlot, profileHref = '/portal/profile', searchPlaceholder = 'Хэрэг, баримт хайх', labels, className }: PortalHeaderProps) {
  const initials = `${user.lastName.charAt(0)}${user.firstName.charAt(0)}`.toUpperCase();
  const bell = bellSlot ?? (notificationsHref === null ? null : (
    <Link href={notificationsHref} aria-label={unreadCount ? `Мэдэгдэл, ${unreadCount} уншаагүй` : 'Мэдэгдэл'} className="focus-ring relative inline-flex size-11 items-center justify-center rounded-md text-text-secondary hover:bg-bg-surface-alt">
      <NotificationsIcon size={44} />
      {unreadCount > 0 && <span aria-hidden className="absolute right-3 top-3 size-2 rounded-full bg-accent-default" />}
    </Link>
  ));

  return (
    <header className={cn('sticky top-0 z-30 border-b border-border-default bg-bg-surface', className)}>
      {/* Desktop 72px */}
      <div className="hidden h-[72px] items-center justify-between gap-4 px-8 md:flex">
        <h1 className="truncate text-h4">{title}</h1>
        <div className="flex shrink-0 items-center gap-4">
          {onSearch && (
            <form
              role="search"
              onSubmit={(e) => { e.preventDefault(); onSearch(new FormData(e.currentTarget).get('q')?.toString() ?? ''); }}
              className="hidden h-11 w-[280px] items-center gap-2.5 rounded-md border border-border-default bg-bg-surface-alt px-3.5 focus-within:border-2 focus-within:border-border-focus lg:flex"
            >
              <SearchIcon size={16} className="shrink-0 text-text-muted" />
              <input name="q" type="search" placeholder={searchPlaceholder} aria-label={searchPlaceholder} className="w-full bg-transparent text-body-sm text-text-primary outline-none placeholder:text-text-muted" />
            </form>
          )}
          {bell}
          <Link href={profileHref} className="focus-ring flex items-center gap-2.5 rounded-md pr-1">
            <Avatar size="sm" initials={initials} src={user.avatarUrl} className="size-9" />
            <span className="hidden text-body-sm-medium text-text-primary lg:inline">{user.lastName.charAt(0)}. {user.firstName}</span>
          </Link>
        </div>
      </div>
      {/* Mobile 64px */}
      <div className="flex h-16 items-center justify-between pl-2 pr-2 md:hidden">
        <div className="flex items-center gap-1">
          {backHref ? (
            <Link href={backHref} aria-label={labels?.back ?? 'Буцах'} className="focus-ring inline-flex size-11 items-center justify-center rounded-md text-text-primary">
              <BackIcon size={44} />
            </Link>
          ) : <span className="w-2" />}
          <h1 className="text-body-medium text-text-primary">{title}</h1>
        </div>
        <div className="flex items-center">
          {bell}
          <Link href={profileHref} aria-label={labels?.profile ?? 'Профайл'} className="focus-ring inline-flex size-11 items-center justify-center rounded-md">
            <Avatar size="sm" initials={initials} src={user.avatarUrl} />
          </Link>
        </div>
      </div>
    </header>
  );
}
