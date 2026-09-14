'use client';

import { useQueries, useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useUser } from '@/components/portal/user-context';
import { CASE_STATUS_BADGE, INVOICE_STATUS_BADGE, StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CaseCard } from '@/components/ui/card';
import { CardSkeleton, EmptyState, ErrorState, Skeleton } from '@/components/ui/states';
import { ApiError, api, type CaseEvent, type CaseListItem, type InvoiceItem, type NotificationItem, type Paginated } from '@/lib/api';
import { CASE_EVENT_LABELS, formatDate, formatMoney } from '@/lib/format';

const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };

export default function DashboardPage() {
  const { user } = useUser();
  const cases = useQuery({ queryKey: ['cases', 'all'], queryFn: () => api.get<Paginated<CaseListItem>>('/cases?limit=50') });
  const invoices = useQuery({ queryKey: ['invoices', 'all'], queryFn: () => api.get<Paginated<InvoiceItem>>('/invoices?limit=50') });
  const notifications = useQuery({ queryKey: ['notifications'], queryFn: () => api.get<{ items: NotificationItem[]; unreadCount: number }>('/notifications') });

  const activeCases = (cases.data?.items ?? []).filter((c) => c.status !== 'CLOSED');
  const eventQueries = useQueries({
    queries: activeCases.slice(0, 10).map((c) => ({
      queryKey: ['case-events', c.id],
      queryFn: () => api.get<CaseEvent[]>(`/cases/${c.id}/events`),
    })),
  });
  const today = startOfToday();
  const upcoming = eventQueries
    .flatMap((q, i) => (q.data ?? []).map((e) => ({ ...e, caseItem: activeCases[i] })))
    .filter((e) => new Date(e.eventDate) >= today)
    .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime())
    .slice(0, 5);
  const eventsLoading = eventQueries.some((q) => q.isLoading);

  const openInvoices = (invoices.data?.items ?? []).filter((i) => i.status === 'SENT' || i.status === 'OVERDUE');
  const openAmount = openInvoices.reduce((sum, i) => sum + Number(i.amount), 0);
  const unread = (notifications.data?.items ?? []).filter((n) => !n.isRead).slice(0, 5);

  const error = [cases, invoices, notifications].find((q) => q.isError)?.error;
  if (error) return <ErrorState message={error instanceof ApiError ? error.message : 'Өгөгдөл ачаалахад алдаа гарлаа'} onRetry={() => { void cases.refetch(); void invoices.refetch(); void notifications.refetch(); }} />;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <p className="text-overline text-text-accent">Хянах самбар</p>
        <h2 className="text-h3 md:text-h2">Сайн байна уу, {user.firstName}</h2>
        <p className="text-body text-text-secondary">Хэргийн явц, төлбөр, мэдэгдлийн товч тойм.</p>
      </div>

      {/* Stat tiles */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Идэвхтэй хэрэг" value={cases.isLoading ? null : String(activeCases.length)} href="/portal/cases" />
        <Stat label="Төлөгдөөгүй нэхэмжлэх" value={invoices.isLoading ? null : formatMoney(openAmount)} href="/portal/invoices" tone={openInvoices.some((i) => i.status === 'OVERDUE') ? 'danger' : undefined} />
        <Stat label="Уншаагүй мэдэгдэл" value={notifications.isLoading ? null : String(notifications.data?.unreadCount ?? 0)} href="/portal/notifications" />
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="flex flex-col gap-8">
          {/* My cases */}
          <section className="flex flex-col gap-4">
            <SectionTitle title="Миний хэргүүд" href="/portal/cases" />
            {cases.isLoading ? (
              <div className="grid gap-4 md:grid-cols-2"><CardSkeleton /><CardSkeleton /></div>
            ) : (cases.data?.items.length ?? 0) === 0 ? (
              <EmptyState title="Хэрэг бүртгэгдээгүй байна" description="Таны нэр дээр хэрэг бүртгэгдмэгц энд харагдана." />
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {cases.data!.items.slice(0, 4).map((c) => {
                  const next = upcoming.find((e) => e.caseItem.id === c.id);
                  return (
                    <CaseCard key={c.id} caseNumber={c.caseNumber} title={c.title} status={CASE_STATUS_BADGE[c.status]} lawyer={c.lawyer} href={`/portal/cases/${c.id}`} footer={next ? `${CASE_EVENT_LABELS[next.type] ?? next.type}: ${formatDate(next.eventDate, true)}` : `Шинэчлэгдсэн: ${formatDate(c.updatedAt)}`} />
                  );
                })}
              </div>
            )}
          </section>

          {/* Unpaid invoices */}
          <section className="flex flex-col gap-4">
            <SectionTitle title="Төлөгдөөгүй нэхэмжлэх" href="/portal/invoices" />
            {invoices.isLoading ? (
              <Skeleton className="h-32" />
            ) : openInvoices.length === 0 ? (
              <EmptyState title="Төлөгдөөгүй нэхэмжлэх байхгүй" />
            ) : (
              <ul className="divide-y divide-border-default overflow-hidden rounded-lg border border-border-default bg-bg-surface">
                {openInvoices.slice(0, 5).map((inv) => (
                  <li key={inv.id}>
                    <Link href={`/portal/invoices/${inv.id}`} className="focus-ring flex flex-wrap items-center justify-between gap-3 px-6 py-4 hover:bg-bg-brand-soft">
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <p className="text-body-sm-medium text-text-primary">{inv.invoiceNumber} · {formatMoney(inv.amount)}</p>
                        <p className="truncate text-caption text-text-muted">{inv.case.caseNumber} · төлөх хугацаа {formatDate(inv.dueDate)}</p>
                      </div>
                      <StatusBadge map={INVOICE_STATUS_BADGE} status={inv.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="flex flex-col gap-8">
          {/* Upcoming events */}
          <section className="flex flex-col gap-4">
            <SectionTitle title="Удахгүй болох" />
            {eventsLoading || cases.isLoading ? (
              <Skeleton className="h-40" />
            ) : upcoming.length === 0 ? (
              <EmptyState title="Товлогдсон үйл явдал байхгүй" />
            ) : (
              <ol className="flex flex-col gap-3">
                {upcoming.map((e) => (
                  <li key={e.id} className="flex gap-4 rounded-lg border border-border-default bg-bg-surface p-4">
                    <div className="flex w-14 shrink-0 flex-col items-center rounded-md bg-bg-brand-soft py-2 text-text-brand">
                      <span className="font-serif text-h4">{new Date(e.eventDate).getDate()}</span>
                      <span className="text-caption">{new Date(e.eventDate).getMonth() + 1}-р сар</span>
                    </div>
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <p className="text-caption text-text-accent">{CASE_EVENT_LABELS[e.type] ?? e.type}</p>
                      <p className="text-body-sm-medium text-text-primary">{e.title}</p>
                      <Link href={`/portal/cases/${e.caseItem.id}`} className="focus-ring truncate rounded-sm text-caption text-text-muted hover:text-text-brand">{e.caseItem.caseNumber} · {formatDate(e.eventDate, true)}</Link>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>

          {/* Unread notifications */}
          <section className="flex flex-col gap-4">
            <SectionTitle title="Уншаагүй мэдэгдэл" href="/portal/notifications" />
            {notifications.isLoading ? (
              <Skeleton className="h-32" />
            ) : unread.length === 0 ? (
              <EmptyState title="Шинэ мэдэгдэл байхгүй" />
            ) : (
              <ul className="divide-y divide-border-default overflow-hidden rounded-lg border border-border-default bg-bg-surface">
                {unread.map((n) => (
                  <li key={n.id} className="flex flex-col gap-0.5 px-5 py-3">
                    <p className="text-body-sm-medium text-text-primary">{n.title}</p>
                    <p className="text-body-sm text-text-secondary">{n.body}</p>
                    <p className="text-caption text-text-muted">{formatDate(n.createdAt, true)}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, href, tone }: { label: string; value: string | null; href: string; tone?: 'danger' }) {
  return (
    <Link href={href} className="focus-ring flex flex-col gap-2 rounded-lg border border-border-default bg-bg-surface p-5 transition-colors hover:border-border-strong">
      <span className="text-caption text-text-muted">{label}</span>
      {value === null ? <Skeleton className="h-9 w-24" /> : <span className={`font-serif text-h3 ${tone === 'danger' ? 'text-status-danger-fg' : 'text-text-brand'}`}>{value}</span>}
    </Link>
  );
}

function SectionTitle({ title, href }: { title: string; href?: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <h3 className="text-h4">{title}</h3>
      {href && <Button asChild variant="ghost" size="sm"><Link href={href}>Бүгд →</Link></Button>}
    </div>
  );
}
