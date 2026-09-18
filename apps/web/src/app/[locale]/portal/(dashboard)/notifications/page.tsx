// Figma: 02 Client Portal / Portal / 09 Notifications / Desktop (33:652) + Mobile (37:1193)
'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';
import { EmptySearchGlyph } from '@/components/icons';
import { NotificationRow, groupByDay } from '@/components/notifications/notification-row';
import { Button } from '@/components/ui/button';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/states';
import { toast } from '@/components/ui/toast';
import { ApiError, api, type NotificationItem } from '@/lib/api';
import { cn } from '@/lib/utils';

type Data = { items: NotificationItem[]; unreadCount: number };
type Filter = 'ALL' | 'UNREAD' | 'CASE' | 'INVOICE' | 'MESSAGE';

// Figma "Filters" chips. Mobile hides the messages chip and drops the unread count, as in 37:1209.
const FILTER_TYPES: Record<Exclude<Filter, 'ALL' | 'UNREAD'>, string[]> = {
  CASE: ['CASE_EVENT', 'DOCUMENT', 'DOCUMENT_REQUEST', 'CONTACT_REQUEST'],
  INVOICE: ['INVOICE'],
  MESSAGE: ['MESSAGE'],
};

export default function NotificationsPage() {
  const t = useTranslations('portal.notifications');
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['notifications'], queryFn: () => api.get<Data>('/notifications') });
  const [filter, setFilter] = useState<Filter>('ALL');

  const markRead = useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['notifications'] }),
    onError: (e) => toast.danger(t('error'), e instanceof ApiError ? e.message : undefined),
  });
  const markAll = useMutation({
    mutationFn: () => api.patch<{ updated: number }>('/notifications/read-all'),
    onSuccess: (r) => { toast.success(t('allReadToast'), t('allReadBody', { count: r.updated })); void queryClient.invalidateQueries({ queryKey: ['notifications'] }); },
    onError: (e) => toast.danger(t('error'), e instanceof ApiError ? e.message : undefined),
  });

  const items = query.data?.items ?? [];
  const unread = query.data?.unreadCount ?? 0;
  const visible = items.filter((n) => (filter === 'ALL' ? true : filter === 'UNREAD' ? !n.isRead : FILTER_TYPES[filter].includes(n.type)));

  // Group by calendar day, newest first (API already sorts by createdAt desc)
  const formatDay = useCallback(
    (d: Date) => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
      if (same(d, today)) return t('today');
      if (same(d, yesterday)) return t('yesterday');
      const parts = { month: d.getMonth() + 1, day: d.getDate(), year: d.getFullYear() };
      return d.getFullYear() === today.getFullYear() ? t('monthDay', parts) : t('monthDayYear', parts);
    },
    [t],
  );
  const groups = groupByDay(visible, formatDay);

  const chips: { value: Filter; label: React.ReactNode; className?: string }[] = [
    { value: 'ALL', label: t('filters.all') },
    { value: 'UNREAD', label: <>{t('filters.unread')}<span className="hidden md:inline"> ({unread})</span></> },
    { value: 'CASE', label: t('filters.case') },
    { value: 'INVOICE', label: t('filters.invoice') },
    { value: 'MESSAGE', label: t('filters.message'), className: 'hidden md:inline-flex' },
  ];

  return (
    <div className="flex flex-col gap-5 md:gap-4">
      {/* Header — H2 + unread summary + ghost action (desktop); white toolbar strip (mobile) */}
      <div className="-mx-5 -mt-6 flex flex-col gap-3.5 bg-bg-surface px-5 py-4 md:mx-0 md:mt-0 md:gap-4 md:bg-transparent md:p-0">
        <div className="hidden items-center justify-between gap-6 md:flex">
          <div className="flex flex-col gap-1.5">
            <h2 className="text-h2">{t('title')}</h2>
            <p className="text-body text-text-secondary">
              {query.isLoading ? t('loading') : unread > 0 ? t('unreadSummary', { count: unread }) : t('noUnread')}
            </p>
          </div>
          <Button variant="ghost" size="md" disabled={unread === 0 || markAll.isPending} onClick={() => markAll.mutate()}>{t('markAllRead')}</Button>
        </div>
        <div className="flex items-center justify-between gap-3 md:hidden">
          <p className="text-body-sm-medium text-text-primary">{query.isLoading ? t('loading') : t('unreadShort', { count: unread })}</p>
          <button
            type="button"
            disabled={unread === 0 || markAll.isPending}
            onClick={() => markAll.mutate()}
            className="focus-ring -my-2.5 inline-flex min-h-11 items-center rounded-sm text-body-sm-medium text-text-accent hover:underline disabled:text-text-disabled disabled:no-underline"
          >
            {t('markAllRead')}
          </button>
        </div>

        <div role="radiogroup" aria-label={t('filterLabel')} className="flex flex-wrap gap-2.5">
          {chips.map((chip) => {
            const active = chip.value === filter;
            return (
              <button
                key={chip.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setFilter(chip.value)}
                className={cn(
                  'focus-ring inline-flex h-11 items-center justify-center rounded-full px-4 text-body-sm-medium transition-colors md:px-[18px]',
                  active ? 'bg-brand-primary text-text-on-inverse' : 'border border-border-default bg-bg-page text-text-secondary hover:bg-bg-brand-soft md:bg-bg-surface',
                  chip.className,
                )}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      </div>

      {query.isError ? (
        <ErrorState message={query.error instanceof ApiError ? query.error.message : t('error')} onRetry={() => void query.refetch()} />
      ) : query.isLoading ? (
        <div className="flex flex-col gap-2.5 md:gap-3" aria-busy aria-label={t('loadingLabel')}>
          <Skeleton className="h-[18px] w-20 md:h-[22px]" />
          <div className="overflow-hidden rounded-lg border border-border-default bg-bg-surface">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex gap-3 border-b border-border-subtle p-4 last:border-b-0 md:gap-4 md:px-6 md:py-5">
                <Skeleton className="size-9 shrink-0 rounded-md md:size-10" />
                <div className="flex flex-1 flex-col gap-2"><Skeleton className="h-4 w-1/2" /><Skeleton className="h-3.5 w-3/4" /></div>
              </div>
            ))}
          </div>
        </div>
      ) : items.length === 0 ? (
        <EmptyState title={t('emptyTitle')} description={t('emptyDescription')} />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<EmptySearchGlyph />}
          title={t('noneFilteredTitle')}
          description={t('noneFilteredDescription')}
          action={<Button variant="primary" size="md" onClick={() => setFilter('ALL')}>{t('clearFilter')}</Button>}
        />
      ) : (
        <div className="flex flex-col gap-[18px] md:gap-5">
          {groups.map((group) => (
            <section key={group.key} aria-label={group.label} className="flex flex-col gap-2.5 md:gap-3">
              <h3 className="text-caption text-text-muted md:text-body-sm-medium">{group.label}</h3>
              <ul className="overflow-hidden rounded-lg border border-border-default bg-bg-surface">
                {group.items.map((n) => (
                  <NotificationRow
                    key={n.id}
                    item={n}
                    linkPrefix="/portal"
                    onRead={() => markRead.mutate(n.id)}
                    pending={markRead.isPending && markRead.variables === n.id}
                    labels={{ unread: t('unreadLabel'), markRead: t('markRead') }}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
