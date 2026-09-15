'use client';

import Link from 'next/link';
import { NotifCaseIcon, NotifClockIcon, NotifDocumentIcon, NotifGenericIcon, NotifInvoiceIcon, NotifMessageIcon, NotifRequestIcon } from '@/components/icons';
import type { NotificationItem } from '@/lib/api';
import { cn, shortName } from '@/lib/utils';

// Figma notification "Icon" per type
export const NOTIFICATION_TYPE_ICONS: Record<string, typeof NotifCaseIcon> = {
  CASE_EVENT: NotifCaseIcon,
  CASE_MEMBER: NotifCaseIcon,
  CONTACT_REQUEST: NotifRequestIcon,
  MESSAGE: NotifMessageIcon,
  DOCUMENT: NotifDocumentIcon,
  DOCUMENT_REQUEST: NotifDocumentIcon,
  INVOICE: NotifInvoiceIcon,
  MEETING: NotifClockIcon,
  HEARING: NotifClockIcon,
  TASK: NotifClockIcon,
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

/** Groups by calendar day, keeping the API's newest-first order. */
export function groupByDay(items: NotificationItem[]): { key: string; label: string; items: NotificationItem[] }[] {
  const groups: { key: string; label: string; items: NotificationItem[] }[] = [];
  for (const n of items) {
    const d = new Date(n.createdAt);
    const key = dayKey(d);
    const last = groups[groups.length - 1];
    if (last?.key === key) last.items.push(n);
    else groups.push({ key, label: dayLabel(d), items: [n] });
  }
  return groups;
}

/**
 * Figma "Notification" row (33:689 desktop / 37:1222 mobile). Unread rows use bg-brand-soft + gold dot.
 * The row itself is the action: a link inside this app area (`linkPrefix`) opens it and marks it read;
 * otherwise an unread row marks read on click. Staff rows also name who caused the notification.
 */
export function NotificationRow({ item, onRead, pending, linkPrefix, showActor = false }: {
  item: NotificationItem;
  onRead: () => void;
  pending: boolean;
  linkPrefix: '/portal' | '/admin';
  showActor?: boolean;
}) {
  const Icon = NOTIFICATION_TYPE_ICONS[item.type] ?? NotifGenericIcon;
  const d = new Date(item.createdAt);
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const meta = showActor && item.actor ? `${shortName(item.actor.firstName, item.actor.lastName)} · ${time}` : time;
  const href = item.link?.startsWith(linkPrefix) ? item.link : null;

  const content = (
    <>
      <Icon compact className="shrink-0 md:hidden" />
      <Icon className="hidden shrink-0 md:block" />
      <div className="flex min-w-0 flex-1 flex-col gap-[3px] md:gap-1">
        <div className="flex items-start justify-between gap-3">
          <p className="min-w-0 text-body-sm-medium text-text-primary md:text-body-medium">
            {item.title}{!item.isRead && <span className="sr-only"> (уншаагүй)</span>}
          </p>
          <span className="shrink-0 pt-0.5 text-caption text-text-muted md:hidden">{meta}</span>
        </div>
        <p className="text-caption text-text-secondary md:text-body-sm">{item.body}</p>
      </div>
      <div className="hidden shrink-0 items-center gap-3 md:flex">
        <span className="text-caption text-text-muted">{meta}</span>
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
