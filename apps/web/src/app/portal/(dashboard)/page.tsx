// Figma: 02 Client Portal / Portal / 03 Dashboard / Desktop (29:98) + Mobile (35:1017)
'use client';

import { useQueries, useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { StatCasesIcon, StatClockIcon, StatInvoiceIcon, StatNotificationsIcon } from '@/components/icons';
import { useUser } from '@/components/portal/user-context';
import { CASE_STATUS_BADGE } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CaseCard } from '@/components/ui/card';
import { CardSkeleton, EmptyState, ErrorState, Skeleton } from '@/components/ui/states';
import { ApiError, api, type CaseEvent, type CaseListItem, type DocumentRequestSummary, type InvoiceItem, type NotificationItem, type Paginated } from '@/lib/api';
import { useDocumentRequestSummary } from '@/lib/document-requests';
import { CASE_EVENT_LABELS, formatDate, formatMoney } from '@/lib/format';
import { cn } from '@/lib/utils';

const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };

const WEEKDAYS = ['Ням', 'Даваа', 'Мягмар', 'Лхагва', 'Пүрэв', 'Баасан', 'Бямба'];
/** "9 дүгээр сарын" — vowel-harmony suffix for the month ordinal. */
const monthOrdinal = (m: number) => `${m} ${[1, 4, 9, 11].includes(m) ? 'дүгээр' : 'дугаар'}`;
/** Desktop: "2026 оны 9 дүгээр сарын 14, Даваа гараг" · Mobile: "2026.09.14" */
function todayLabels(d: Date) {
  return {
    long: `${d.getFullYear()} оны ${monthOrdinal(d.getMonth() + 1)} сарын ${d.getDate()}, ${WEEKDAYS[d.getDay()]} гараг`,
    short: formatDate(d),
  };
}

/** "2026.09.24, 10:00" */
const formatDateTime = (iso: string) => {
  const d = new Date(iso);
  return `${formatDate(d)}, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
const formatTime = (iso: string) => formatDateTime(iso).split(', ')[1];

/** "2 цагийн өмнө" · "Өчигдөр" · "3 хоногийн өмнө" */
function timeAgo(iso: string): string {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return 'Дөнгөж сая';
  if (minutes < 60) return `${minutes} минутын өмнө`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} цагийн өмнө`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Өчигдөр';
  if (days < 30) return `${days} хоногийн өмнө`;
  return formatDate(iso);
}

/** Case-card footer: "Дараагийн хуралдаан: 2026.09.24, 10:00" */
const NEXT_EVENT_LABELS: Record<string, string> = {
  HEARING: 'Дараагийн хуралдаан',
  MEETING: 'Дараагийн уулзалт',
  DEADLINE: 'Эцсийн хугацаа',
  DOCUMENT: 'Баримт хүлээгдэж байна',
};

export default function DashboardPage() {
  const { user } = useUser();
  const cases = useQuery({ queryKey: ['cases', 'all'], queryFn: () => api.get<Paginated<CaseListItem>>('/cases?limit=50') });
  const invoices = useQuery({ queryKey: ['invoices', 'all'], queryFn: () => api.get<Paginated<InvoiceItem>>('/invoices?limit=50') });
  const notifications = useQuery({ queryKey: ['notifications'], queryFn: () => api.get<{ items: NotificationItem[]; unreadCount: number }>('/notifications') });
  const requestSummary = useDocumentRequestSummary();

  // Today's date is rendered after mount so the server and client markup agree.
  const [today, setToday] = useState<{ long: string; short: string } | null>(null);
  useEffect(() => { setToday(todayLabels(new Date())); }, []);

  const activeCases = (cases.data?.items ?? []).filter((c) => c.status !== 'CLOSED');
  const eventQueries = useQueries({
    queries: activeCases.slice(0, 10).map((c) => ({
      queryKey: ['case-events', c.id],
      queryFn: () => api.get<CaseEvent[]>(`/cases/${c.id}/events`),
    })),
  });
  const dayStart = startOfToday();
  const upcomingAll = eventQueries
    .flatMap((q, i) => (q.data ?? []).map((e) => ({ ...e, caseItem: activeCases[i] })))
    .filter((e) => new Date(e.eventDate) >= dayStart)
    .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());
  const upcoming = upcomingAll.slice(0, 3);
  const eventsLoading = eventQueries.some((q) => q.isLoading);

  const openInvoices = (invoices.data?.items ?? [])
    .filter((i) => i.status === 'SENT' || i.status === 'OVERDUE')
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  const dueInvoice = openInvoices[0];
  const recentNotifications = (notifications.data?.items ?? []).slice(0, 4);

  const error = [cases, invoices, notifications].find((q) => q.isError)?.error;
  if (error) return <ErrorState message={error instanceof ApiError ? error.message : 'Өгөгдөл ачаалахад алдаа гарлаа'} onRetry={() => { void cases.refetch(); void invoices.refetch(); void notifications.refetch(); }} />;

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      {/* Greeting — full-bleed white strip on mobile, plain on desktop */}
      <div className="-mx-5 -mt-6 flex flex-col gap-1.5 bg-bg-surface px-5 py-6 md:mx-0 md:mt-0 md:gap-2 md:bg-transparent md:p-0">
        <h2 className="text-h3 md:text-h2">Сайн байна уу, {user.firstName}</h2>
        <p className="text-body-sm text-text-secondary md:text-body">
          {today ? <><span className="md:hidden">{today.short}</span><span className="hidden md:inline">{today.long}</span> · </> : null}
          {cases.isLoading ? 'Хэргийн мэдээлэл ачааллаж байна' : `Танд ${activeCases.length} идэвхтэй хэрэг байна`}
        </p>
      </div>

      {/* Stat cards — 4 across on desktop, 2×2 on mobile */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
        <Stat label="Идэвхтэй хэрэг" value={cases.isLoading ? null : String(activeCases.length)} href="/portal/cases" tone="new" icon={<StatCasesIcon />} />
        <Stat label="Уншаагүй мэдэгдэл" value={notifications.isLoading ? null : String(notifications.data?.unreadCount ?? 0)} href="/portal/notifications" tone="pending" icon={<StatNotificationsIcon />} />
        <Stat label="Төлөгдөөгүй нэхэмжлэх" value={invoices.isLoading ? null : String(openInvoices.length)} href="/portal/invoices" tone="danger" icon={<StatInvoiceIcon />} />
        <Stat label="Удахгүй болох уулзалт" value={eventsLoading || cases.isLoading ? null : String(upcomingAll.length)} href="/portal/cases" tone="progress" icon={<StatClockIcon />} />
      </div>

      {requestSummary.data && requestSummary.data.total > 0 && <DocumentRequestsCard summary={requestSummary.data} />}

      {/* My cases */}
      <section className="flex flex-col gap-4 md:gap-5">
        <SectionTitle title="Миний хэргүүд" href="/portal/cases" />
        {cases.isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 md:gap-5"><CardSkeleton /><CardSkeleton /></div>
        ) : (cases.data?.items.length ?? 0) === 0 ? (
          <EmptyState title="Хэрэг бүртгэгдээгүй байна" description="Таны нэр дээр хэрэг бүртгэгдмэгц энд харагдана." />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 md:gap-5">
            {cases.data!.items.slice(0, 4).map((c) => {
              const next = upcomingAll.find((e) => e.caseItem.id === c.id);
              const footer = next
                ? `${NEXT_EVENT_LABELS[next.type] ?? CASE_EVENT_LABELS[next.type] ?? next.type}: ${formatDateTime(next.eventDate)}`
                : `Шинэчлэгдсэн: ${formatDate(c.updatedAt)}`;
              return <CaseCard key={c.id} caseNumber={c.caseNumber} title={c.title} status={CASE_STATUS_BADGE[c.status]} lawyer={c.lawyer} href={`/portal/cases/${c.id}`} footer={footer} />;
            })}
          </div>
        )}
      </section>

      {/* Panels: upcoming events + recent notifications (notifications panel is desktop-only, as in Figma) */}
      <div className="grid gap-6 md:grid-cols-2 md:gap-5">
        <section className="flex flex-col gap-3.5 md:gap-0">
          <h3 className="text-h4 md:hidden">Удахгүй болох</h3>
          <Card className="flex flex-col md:gap-4 md:p-6">
            <h3 className="hidden text-h4 md:block">Удахгүй болох хуралдаан, уулзалт</h3>
            {eventsLoading || cases.isLoading ? (
              <div className="flex flex-col gap-3 p-4 md:p-0"><Skeleton className="h-14" /><Skeleton className="h-14" /></div>
            ) : upcoming.length === 0 ? (
              <p className="p-4 text-body-sm text-text-secondary md:p-0">Товлогдсон хуралдаан, уулзалт байхгүй.</p>
            ) : (
              <ol className="flex flex-col divide-y divide-border-subtle md:divide-y-0">
                {upcoming.map((e) => {
                  const d = new Date(e.eventDate);
                  return (
                    <li key={e.id} className="flex items-center gap-3.5 p-4 md:gap-4 md:px-0 md:py-1">
                      <div className="flex size-[52px] shrink-0 flex-col items-center justify-center rounded-md bg-bg-brand-soft md:size-14" aria-hidden>
                        <span className="font-serif text-[20px] font-semibold leading-7 text-text-brand md:text-h4">{String(d.getDate()).padStart(2, '0')}</span>
                        <span className="text-caption text-text-muted">{d.getMonth() + 1} сар</span>
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col gap-[3px] md:gap-1">
                        <Link href={`/portal/cases/${e.caseItem.id}`} className="focus-ring truncate rounded-sm text-body-sm-medium text-text-primary hover:text-text-brand">
                          {CASE_EVENT_LABELS[e.type] ?? e.type} · {e.caseItem.caseNumber}
                        </Link>
                        <p className="text-caption text-text-secondary md:text-body-sm">{e.title}, {formatTime(e.eventDate)}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </Card>
        </section>

        <Card className="hidden flex-col gap-3.5 p-6 md:flex">
          <SectionTitle title="Сүүлийн мэдэгдэл" href="/portal/notifications" size="h4" />
          {notifications.isLoading ? (
            <div className="flex flex-col gap-3"><Skeleton className="h-10" /><Skeleton className="h-10" /><Skeleton className="h-10" /></div>
          ) : recentNotifications.length === 0 ? (
            <p className="text-body-sm text-text-secondary">Мэдэгдэл байхгүй.</p>
          ) : (
            <ul className="flex flex-col">
              {recentNotifications.map((n) => (
                <li key={n.id} className="flex items-start gap-3 py-1.5">
                  <span aria-hidden className={cn('mt-[7px] size-2 shrink-0 rounded-full', n.isRead ? 'bg-neutral-300' : 'bg-accent-default')} />
                  <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
                    <p className={cn('truncate text-body-sm-medium', n.isRead ? 'text-text-secondary' : 'text-text-primary')}>
                      {n.isRead ? n.title : <>{n.title}<span className="sr-only"> (уншаагүй)</span></>}
                    </p>
                    <p className="text-caption text-text-muted">{n.body} · {timeAgo(n.createdAt)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Unpaid invoice alert — status-pending, 3px left rule */}
      {invoices.isLoading ? (
        <Skeleton className="h-24" />
      ) : dueInvoice ? (
        <div role="status" className="flex flex-col gap-3 rounded-lg border-l-[3px] border-status-pending-fg bg-status-pending-bg p-5 md:flex-row md:items-center md:justify-between md:gap-6 md:px-7 md:py-6">
          <div className="flex flex-col gap-1.5">
            <p className="text-h4 text-status-pending-fg">
              <span className="md:hidden">Төлөгдөөгүй нэхэмжлэх</span>
              <span className="hidden md:inline">Төлөгдөөгүй нэхэмжлэх байна</span>
            </p>
            <p className="text-body-sm text-text-secondary md:text-body">
              {dueInvoice.invoiceNumber} · {formatMoney(dueInvoice.amount)} · <span className="hidden md:inline">Төлөх эцсийн хугацаа</span><span className="md:hidden">Эцсийн хугацаа</span>: {formatDate(dueInvoice.dueDate)}
              {openInvoices.length > 1 && <> · нийт {openInvoices.length} нэхэмжлэх</>}
            </p>
          </div>
          <div className="flex shrink-0 gap-3">
            <Button asChild variant="ghost" size="md" className="hidden md:inline-flex"><Link href={`/portal/invoices/${dueInvoice.id}`}>Дэлгэрэнгүй</Link></Button>
            <Button asChild variant="primary" size="md" className="w-full md:w-auto"><Link href={`/portal/invoices/${dueInvoice.id}`}>Төлбөр төлөх</Link></Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** "Танаас {n} баримт хүсэлттэй байна" — jumps to the case with the most open requests. */
function DocumentRequestsCard({ summary }: { summary: DocumentRequestSummary }) {
  const [first] = summary.cases;
  if (!first) return null;
  return (
    <div role="status" className="flex flex-col gap-3 rounded-lg border-l-[3px] border-status-new-fg bg-status-new-bg p-5 md:flex-row md:items-center md:justify-between md:gap-6 md:px-7 md:py-6">
      <div className="flex min-w-0 flex-col gap-1.5">
        <p className="text-h4 text-status-new-fg">Танаас {summary.total} баримт хүсэлттэй байна</p>
        <p className="text-body-sm text-text-secondary md:text-body">
          {summary.cases.map((item, index) => (
            <span key={item.caseId}>
              {index > 0 && ' · '}
              <Link href={`/portal/cases/${item.caseId}?tab=requests`} className="focus-ring rounded-sm text-text-primary hover:underline">{item.caseNumber}</Link>
              {`: ${item.count} баримт`}
            </span>
          ))}
        </p>
      </div>
      <Button asChild size="md" className="w-full shrink-0 md:w-auto">
        <Link href={`/portal/cases/${first.caseId}?tab=requests`}>Баримт илгээх</Link>
      </Button>
    </div>
  );
}

type StatTone = 'new' | 'pending' | 'danger' | 'progress';
const STAT_TONE: Record<StatTone, string> = {
  new: 'text-status-new-fg',
  pending: 'text-status-pending-fg',
  danger: 'text-status-danger-fg',
  progress: 'text-status-progress-fg',
};

/** Figma "Stat card": icon tile + H2 number + label (desktop); tinted number + caption (mobile). */
function Stat({ label, value, href, tone, icon }: { label: string; value: string | null; href: string; tone: StatTone; icon: React.ReactNode }) {
  return (
    <Link href={href} className="focus-ring flex flex-col gap-1.5 rounded-lg border border-border-default bg-bg-surface p-4 transition-colors hover:border-border-strong md:gap-3 md:p-6">
      <span className="hidden size-10 md:block" aria-hidden>{icon}</span>
      {value === null ? (
        <Skeleton className="h-[34px] w-12 md:h-11" />
      ) : (
        <span className={cn('font-serif text-[26px] font-semibold leading-[34px] tracking-[-0.2px] md:text-h2 md:text-text-primary', STAT_TONE[tone])}>{value}</span>
      )}
      <span className="text-caption text-text-secondary md:text-body-sm">{label}</span>
    </Link>
  );
}

function SectionTitle({ title, href, size = 'h3' }: { title: string; href?: string; size?: 'h3' | 'h4' }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <h3 className={size === 'h3' ? 'text-h4 md:text-h3' : 'text-h4'}>{title}</h3>
      {href && (
        <Link href={href} className="focus-ring inline-flex min-h-11 items-center rounded-sm text-body-sm-medium text-text-accent hover:underline">
          <span className="md:hidden">Бүгд →</span>
          <span className="hidden md:inline">Бүгдийг харах →</span>
        </Link>
      )}
    </div>
  );
}
