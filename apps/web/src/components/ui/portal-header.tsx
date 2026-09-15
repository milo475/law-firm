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
  profileHref?: string;
  searchPlaceholder?: string;
  className?: string;
}

export function PortalHeader({ title, user, unreadCount = 0, backHref, onSearch, notificationsHref = '/portal/notifications', profileHref = '/portal/profile', searchPlaceholder = 'Хэрэг, баримт хайх', className }: PortalHeaderProps) {
  const initials = `${user.lastName.charAt(0)}${user.firstName.charAt(0)}`.toUpperCase();
  const bell = notificationsHref === null ? null : (
    <Link href={notificationsHref} aria-label={unreadCount ? `Мэдэгдэл, ${unreadCount} уншаагүй` : 'Мэдэгдэл'} className="focus-ring relative inline-flex size-11 items-center justify-center rounded-md text-text-secondary hover:bg-bg-surface-alt">
      <NotificationsIcon size={44} />
      {unreadCount > 0 && <span aria-hidden className="absolute right-3 top-3 size-2 rounded-full bg-accent-default" />}
    </Link>
  );

  return (
    <header className={cn('sticky top-0 z-30 border-b border-border-default bg-bg-surface', className)}>
      {/* Desktop 72px */}
      <div className="hidden h-[72px] items-center justify-between px-8 md:flex">
        <h1 className="text-h4">{title}</h1>
        <div className="flex items-center gap-4">
          {onSearch && (
            <form
              role="search"
              onSubmit={(e) => { e.preventDefault(); onSearch(new FormData(e.currentTarget).get('q')?.toString() ?? ''); }}
              className="flex h-11 w-[280px] items-center gap-2.5 rounded-md border border-border-default bg-bg-surface-alt px-3.5 focus-within:border-2 focus-within:border-border-focus"
            >
              <SearchIcon size={16} className="shrink-0 text-text-muted" />
              <input name="q" type="search" placeholder={searchPlaceholder} aria-label={searchPlaceholder} className="w-full bg-transparent text-body-sm text-text-primary outline-none placeholder:text-text-muted" />
            </form>
          )}
          {bell}
          <Link href={profileHref} className="focus-ring flex items-center gap-2.5 rounded-md pr-1">
            <Avatar size="sm" initials={initials} src={user.avatarUrl} className="size-9" />
            <span className="text-body-sm-medium text-text-primary">{user.lastName.charAt(0)}. {user.firstName}</span>
          </Link>
        </div>
      </div>
      {/* Mobile 64px */}
      <div className="flex h-16 items-center justify-between pl-2 pr-2 md:hidden">
        <div className="flex items-center gap-1">
          {backHref ? (
            <Link href={backHref} aria-label="Буцах" className="focus-ring inline-flex size-11 items-center justify-center rounded-md text-text-primary">
              <BackIcon size={44} />
            </Link>
          ) : <span className="w-2" />}
          <h1 className="text-body-medium text-text-primary">{title}</h1>
        </div>
        <div className="flex items-center">
          {bell}
          <Link href={profileHref} aria-label="Профайл" className="focus-ring inline-flex size-11 items-center justify-center rounded-md">
            <Avatar size="sm" initials={initials} src={user.avatarUrl} />
          </Link>
        </div>
      </div>
    </header>
  );
}
