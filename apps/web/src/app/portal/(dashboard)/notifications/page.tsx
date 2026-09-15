// Figma: 02 Client Portal / Portal / 09 Notifications / Desktop (33:652) + Mobile (37:1193)
'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { EmptySearchGlyph, NotifCaseIcon, NotifClockIcon, NotifDocumentIcon, NotifGenericIcon, NotifInvoiceIcon, NotifMessageIcon, NotifRequestIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/states';
import { toast } from '@/components/ui/toast';
import { ApiError, api, type NotificationItem } from '@/lib/api';
import { cn } from '@/lib/utils';

type Data = { items: NotificationItem[]; unreadCount: number };
type Filter = 'ALL' | 'UNREAD' | 'CASE' | 'INVOICE' | 'MESSAGE';

// Figma "Filters" chips. Mobile hides "Мессеж" and drops the unread count, as in 37:1209.
const FILTER_TYPES: Record<Exclude<Filter, 'ALL' | 'UNREAD'>, string[]> = {
  CASE: ['CASE_EVENT', 'DOCUMENT', 'CONTACT_REQUEST'],
  INVOICE: ['INVOICE'],
  MESSAGE: ['MESSAGE'],
};

// Figma notification "Icon" per type
const TYPE_ICONS: Record<string, typeof NotifCaseIcon> = {
  CASE_EVENT: NotifCaseIcon,
  CONTACT_REQUEST: NotifRequestIcon,
  MESSAGE: NotifMessageIcon,
  DOCUMENT: NotifDocumentIcon,
  INVOICE: NotifInvoiceIcon,
  MEETING: NotifClockIcon,
  HEARING: NotifClockIcon,
};

const pad = (n: number) => String(n).padStart(2, '0');
const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
/** Group label: "Өнөөдөр" · "Өчигдөр" · "9 сарын 10" (year prefixed when not the current year) */
function dayLabel(d: Date): string {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (dayKey(d) === dayKey(today)) return 'Өнөөдөр';
  if (dayKey(d) === dayKey(yesterday)) return 'Өчигдөр';
  const label = `${d.getMonth() + 1} сарын ${d.getDate()}`;
  return d.getFullYear() === today.getFullYear() ? label : `${d.getFullYear()} оны ${label}`;
}

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['notifications'], queryFn: () => api.get<Data>('/notifications') });
  const [filter, setFilter] = useState<Filter>('ALL');

  const markRead = useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['notifications'] }),
    onError: (e) => toast.danger('Алдаа гарлаа', e instanceof ApiError ? e.message : undefined),
  });
  const markAll = useMutation({
    mutationFn: () => api.patch<{ updated: number }>('/notifications/read-all'),
    onSuccess: (r) => { toast.success('Бүгдийг уншсан болголоо', `${r.updated} мэдэгдэл`); void queryClient.invalidateQueries({ queryKey: ['notifications'] }); },
    onError: (e) => toast.danger('Алдаа гарлаа', e instanceof ApiError ? e.message : undefined),
  });

  const items = query.data?.items ?? [];
  const unread = query.data?.unreadCount ?? 0;
  const visible = items.filter((n) => (filter === 'ALL' ? true : filter === 'UNREAD' ? !n.isRead : FILTER_TYPES[filter].includes(n.type)));

  // Group by calendar day, newest first (API already sorts by createdAt desc)
  const groups: { key: string; label: string; items: NotificationItem[] }[] = [];
  for (const n of visible) {
    const d = new Date(n.createdAt);
    const key = dayKey(d);
    const last = groups[groups.length - 1];
    if (last?.key === key) last.items.push(n);
    else groups.push({ key, label: dayLabel(d), items: [n] });
  }

  const chips: { value: Filter; label: React.ReactNode; className?: string }[] = [
    { value: 'ALL', label: 'Бүгд' },
    { value: 'UNREAD', label: <>Уншаагүй<span className="hidden md:inline"> ({unread})</span></> },
    { value: 'CASE', label: 'Хэрэг' },
    { value: 'INVOICE', label: 'Нэхэмжлэх' },
    { value: 'MESSAGE', label: 'Мессеж', className: 'hidden md:inline-flex' },
  ];

  return (
    <div className="flex flex-col gap-5 md:gap-4">
      {/* Header — H2 + unread summary + ghost action (desktop); white toolbar strip (mobile) */}
      <div className="-mx-5 -mt-6 flex flex-col gap-3.5 bg-bg-surface px-5 py-4 md:mx-0 md:mt-0 md:gap-4 md:bg-transparent md:p-0">
        <div className="hidden items-center justify-between gap-6 md:flex">
          <div className="flex flex-col gap-1.5">
            <h2 className="text-h2">Мэдэгдэл</h2>
            <p className="text-body text-text-secondary">
              {query.isLoading ? 'Ачааллаж байна…' : unread > 0 ? `${unread} уншаагүй мэдэгдэл байна` : 'Уншаагүй мэдэгдэл байхгүй'}
            </p>
          </div>
          <Button variant="ghost" size="md" disabled={unread === 0 || markAll.isPending} onClick={() => markAll.mutate()}>Бүгдийг уншсан болгох</Button>
        </div>
        <div className="flex items-center justify-between gap-3 md:hidden">
          <p className="text-body-sm-medium text-text-primary">{query.isLoading ? 'Ачааллаж байна…' : `${unread} уншаагүй`}</p>
          <button
            type="button"
            disabled={unread === 0 || markAll.isPending}
            onClick={() => markAll.mutate()}
            className="focus-ring -my-2.5 inline-flex min-h-11 items-center rounded-sm text-body-sm-medium text-text-accent hover:underline disabled:text-text-disabled disabled:no-underline"
          >
            Бүгдийг уншсан болгох
          </button>
        </div>

        <div role="radiogroup" aria-label="Мэдэгдэл шүүх" className="flex flex-wrap gap-2.5">
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
        <ErrorState message={query.error instanceof ApiError ? query.error.message : 'Алдаа гарлаа'} onRetry={() => void query.refetch()} />
      ) : query.isLoading ? (
        <div className="flex flex-col gap-2.5 md:gap-3" aria-busy aria-label="Ачааллаж байна">
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
        <EmptyState title="Мэдэгдэл байхгүй байна" description="Хэргийн явц, нэхэмжлэх, баримттай холбоотой мэдэгдэл энд харагдана." />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<EmptySearchGlyph />}
          title="Энэ шүүлтүүрт тохирох мэдэгдэл алга"
          description="Өөр шүүлтүүр сонгох эсвэл шүүлтүүрээ цэвэрлэнэ үү."
          action={<Button variant="primary" size="md" onClick={() => setFilter('ALL')}>Шүүлтүүр цэвэрлэх</Button>}
        />
      ) : (
        <div className="flex flex-col gap-[18px] md:gap-5">
          {groups.map((group) => (
            <section key={group.key} aria-label={group.label} className="flex flex-col gap-2.5 md:gap-3">
              <h3 className="text-caption text-text-muted md:text-body-sm-medium">{group.label}</h3>
              <ul className="overflow-hidden rounded-lg border border-border-default bg-bg-surface">
                {group.items.map((n) => (
                  <NotificationRow key={n.id} item={n} onRead={() => markRead.mutate(n.id)} pending={markRead.isPending && markRead.variables === n.id} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Figma "Notification" row (33:689 desktop / 37:1222 mobile). Unread rows use bg-brand-soft + gold dot.
 * The row itself is the action: a portal link opens (and marks read); otherwise an unread row marks read on click.
 */
function NotificationRow({ item, onRead, pending }: { item: NotificationItem; onRead: () => void; pending: boolean }) {
  const Icon = TYPE_ICONS[item.type] ?? NotifGenericIcon;
  const d = new Date(item.createdAt);
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const href = item.link?.startsWith('/portal') ? item.link : null;

  const content = (
    <>
      <Icon compact className="shrink-0 md:hidden" />
      <Icon className="hidden shrink-0 md:block" />
      <div className="flex min-w-0 flex-1 flex-col gap-[3px] md:gap-1">
        <div className="flex items-start justify-between gap-3">
          <p className="min-w-0 text-body-sm-medium text-text-primary md:text-body-medium">
            {item.title}{!item.isRead && <span className="sr-only"> (уншаагүй)</span>}
          </p>
          <span className="shrink-0 pt-0.5 text-caption text-text-muted md:hidden">{time}</span>
        </div>
        <p className="text-caption text-text-secondary md:text-body-sm">{item.body}</p>
      </div>
      <div className="hidden shrink-0 items-center gap-3 md:flex">
        <span className="text-caption text-text-muted">{time}</span>
        {!item.isRead && <span aria-hidden className="size-2.5 rounded-full bg-accent-default" />}
      </div>
      {!item.isRead && <span aria-hidden className="mt-1.5 size-2 shrink-0 rounded-full bg-accent-default md:hidden" />}
    </>
  );

  const rowClass = cn('flex w-full gap-3 p-4 text-left transition-colors md:gap-4 md:px-6 md:py-5', item.isRead ? 'bg-bg-surface' : 'bg-bg-brand-soft');
  const actionClass = cn(rowClass, 'focus-ring hover:bg-bg-surface-alt');

  return (
    <li className="border-b border-border-subtle last:border-b-0">
      {href ? (
        <Link href={href} onClick={() => { if (!item.isRead) onRead(); }} className={actionClass}>{content}</Link>
      ) : !item.isRead ? (
        <button type="button" onClick={onRead} disabled={pending} className={actionClass}>{content}<span className="sr-only">Уншсан болгох</span></button>
      ) : (
        <div className={rowClass}>{content}</div>
      )}
    </li>
  );
}
