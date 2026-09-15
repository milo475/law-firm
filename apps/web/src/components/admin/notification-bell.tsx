'use client';

import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';
import { NotificationsIcon } from '@/components/icons';
import { Skeleton } from '@/components/ui/states';
import { toast } from '@/components/ui/toast';
import { ApiError, api, type NotificationItem } from '@/lib/api';
import { notificationListKey, timeAgo, useNotificationActions, useUnreadNotificationCount, type NotificationPage } from '@/lib/notifications';
import { cn, shortName } from '@/lib/utils';

const LATEST_LIMIT = 12;

/** Admin header bell: unread badge (polled), dropdown with the latest notifications and "mark all read". */
export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  // Radix labels the menu with its trigger ("Мэдэгдэл, 2 уншаагүй"); a fixed title reads better for screen readers.
  const titleId = useId();
  const unread = useUnreadNotificationCount();
  const latest = useQuery({
    queryKey: notificationListKey('latest'),
    queryFn: () => api.get<NotificationPage>(`/notifications?limit=${LATEST_LIMIT}`),
    enabled: open,
  });
  const { markRead, markAll } = useNotificationActions();
  const count = unread.data?.count ?? 0;
  const items = latest.data?.items ?? [];

  function openItem(item: NotificationItem) {
    if (!item.isRead) markRead.mutate(item.id);
    if (item.link?.startsWith('/admin')) router.push(item.link);
  }

  return (
    <DropdownMenu.Root open={open} onOpenChange={setOpen}>
      <DropdownMenu.Trigger
        aria-label={count ? `Мэдэгдэл, ${count} уншаагүй` : 'Мэдэгдэл'}
        className="focus-ring relative inline-flex size-11 items-center justify-center rounded-md text-text-secondary hover:bg-bg-surface-alt data-[state=open]:bg-bg-surface-alt"
      >
        <NotificationsIcon size={44} />
        {count > 0 && (
          <span aria-hidden data-testid="notification-badge" className="absolute right-0.5 top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-accent-default px-1.5 py-px text-caption text-text-on-accent">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          collisionPadding={8}
          aria-labelledby={titleId}
          className="z-50 flex max-h-[min(560px,calc(100vh-96px))] w-[min(400px,calc(100vw-16px))] flex-col overflow-hidden rounded-lg border border-border-default bg-bg-surface shadow-menu"
        >
          <span id={titleId} className="sr-only">Сүүлийн мэдэгдлүүд</span>
          <div className="flex items-center justify-between gap-3 border-b border-border-default px-4 py-3">
            <p className="min-w-0 truncate whitespace-nowrap text-body-sm-medium text-text-primary">Мэдэгдэл{count > 0 && <> · {count}<span className="hidden sm:inline"> уншаагүй</span></>}</p>
            <DropdownMenu.Item
              disabled={count === 0 || markAll.isPending}
              onSelect={(event) => {
                event.preventDefault();
                markAll.mutate(undefined, {
                  onError: (error) => toast.danger('Алдаа гарлаа', error instanceof ApiError ? error.message : undefined),
                });
              }}
              className="focus-ring shrink-0 cursor-pointer whitespace-nowrap rounded-sm px-1 py-1 text-body-sm-medium text-text-accent outline-none hover:underline data-[disabled]:cursor-default data-[disabled]:text-text-disabled data-[disabled]:no-underline data-[highlighted]:underline"
            >
              Бүгдийг уншсан болгох
            </DropdownMenu.Item>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {latest.isError ? (
              <p role="alert" className="px-4 py-6 text-body-sm text-status-danger-fg">Мэдэгдэл ачаалж чадсангүй.</p>
            ) : latest.isLoading ? (
              <div className="flex flex-col gap-3 p-4"><Skeleton className="h-12" /><Skeleton className="h-12" /><Skeleton className="h-12" /></div>
            ) : items.length === 0 ? (
              <p className="px-4 py-8 text-center text-body-sm text-text-muted">Мэдэгдэл алга. Даалгавар, хэрэг, мессежийн шинэчлэл энд харагдана.</p>
            ) : (
              items.map((item) => (
                <DropdownMenu.Item
                  key={item.id}
                  onSelect={() => openItem(item)}
                  className={cn(
                    'flex cursor-pointer gap-3 border-b border-border-subtle px-4 py-3 outline-none last:border-b-0 data-[highlighted]:bg-bg-surface-alt',
                    !item.isRead && 'bg-bg-brand-soft',
                  )}
                >
                  <span aria-hidden className={cn('mt-[7px] size-2 shrink-0 rounded-full', item.isRead ? 'bg-transparent' : 'bg-accent-default')} />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className={cn('line-clamp-2 text-body-sm-medium', item.isRead ? 'text-text-secondary' : 'text-text-primary')}>
                      {item.title}{!item.isRead && <span className="sr-only"> (уншаагүй)</span>}
                    </span>
                    <span className="truncate text-caption text-text-secondary">{item.body}</span>
                    <span className="text-caption text-text-muted">
                      {item.actor ? `${shortName(item.actor.firstName, item.actor.lastName)} · ` : ''}{timeAgo(item.createdAt)}
                    </span>
                  </span>
                </DropdownMenu.Item>
              ))
            )}
          </div>
          <DropdownMenu.Item asChild>
            <Link href="/admin/notifications" className="focus-ring block border-t border-border-default px-4 py-3 text-center text-body-sm-medium text-text-brand outline-none hover:bg-bg-surface-alt data-[highlighted]:bg-bg-surface-alt">
              Бүгдийг харах
            </Link>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
