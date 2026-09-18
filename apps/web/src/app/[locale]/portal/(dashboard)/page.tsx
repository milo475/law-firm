// Figma: 02 Client Portal / Portal / 03 Dashboard / Desktop (29:98) + Mobile (35:1017)
'use client';

import { useQueries, useQuery } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { StatCasesIcon, StatClockIcon, StatInvoiceIcon, StatNotificationsIcon } from '@/components/icons';
import { useUser } from '@/components/portal/user-context';
import { CASE_STATUS_BADGE } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CaseCard } from '@/components/ui/card';
import { CardSkeleton, EmptyState, ErrorState, Skeleton } from '@/components/ui/states';
import { ApiError, api, type CaseEvent, type CaseListItem, type DocumentRequestSummary, type InvoiceItem, type MessageUnreadSummary, type NotificationItem, type Paginated, type ServiceRequestItem } from '@/lib/api';
import { useDocumentRequestSummary } from '@/lib/document-requests';
import { useMessageUnreadSummary } from '@/lib/messages';
import { isOpenServiceRequest, useMyServiceRequests } from '@/lib/service-requests';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { formatDate, formatDateWithWeekday, formatMonthShort, formatMoney, formatTimeAgo } from '@/lib/format';
import { cn } from '@/lib/utils';

const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };

/** Desktop: "2026 оны есдүгээр сарын 14, даваа гараг" · Mobile: "2026.09.14" */
function todayLabels(d: Date, locale: Locale) {
  return { long: formatDateWithWeekday(d, locale), short: formatDate(d, locale) };
}

/** "2026.09.24, 10:00" */
const formatDateTime = (iso: string, locale: Locale) => formatDate(iso, locale, true);
const formatTime = (iso: string, locale: Locale) => formatDateTime(iso, locale).split(', ').pop() ?? '';

/** Case-card footer: "Дараагийн хуралдаан: 2026.09.24, 10:00" — keys live under portal.dashboard.nextEvent. */
const NEXT_EVENT_KEYS = ['HEARING', 'MEETING', 'DEADLINE', 'DOCUMENT'] as const;

export default function DashboardPage() {
  const t = useTranslations('portal.dashboard');
  const tEvent = useTranslations('enums.caseEvent');
  const locale = useLocale() as Locale;
  const { user } = useUser();
  const cases = useQuery({ queryKey: ['cases', 'all'], queryFn: () => api.get<Paginated<CaseListItem>>('/cases?limit=50') });
  const invoices = useQuery({ queryKey: ['invoices', 'all'], queryFn: () => api.get<Paginated<InvoiceItem>>('/invoices?limit=50') });
  const notifications = useQuery({ queryKey: ['notifications'], queryFn: () => api.get<{ items: NotificationItem[]; unreadCount: number }>('/notifications') });
  const requestSummary = useDocumentRequestSummary();
  const messageSummary = useMessageUnreadSummary();
  const myRequests = useMyServiceRequests(1, 10);
  const openServiceRequests = (myRequests.data?.items ?? []).filter(isOpenServiceRequest);

  // Today's date is rendered after mount so the server and client markup agree.
  const [today, setToday] = useState<{ long: string; short: string } | null>(null);
  useEffect(() => { setToday(todayLabels(new Date(), locale)); }, [locale]);

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
  const awaitingInvoices = (invoices.data?.items ?? []).filter((i) => i.status === 'AWAITING_CONFIRMATION');
  const recentNotifications = (notifications.data?.items ?? []).slice(0, 4);

  const error = [cases, invoices, notifications].find((q) => q.isError)?.error;
  if (error) return <ErrorState message={error instanceof ApiError ? error.message : t('loadError')} onRetry={() => { void cases.refetch(); void invoices.refetch(); void notifications.refetch(); }} />;

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      {/* Greeting — full-bleed white strip on mobile, plain on desktop */}
      <div className="-mx-5 -mt-6 flex flex-col gap-1.5 bg-bg-surface px-5 py-6 md:mx-0 md:mt-0 md:gap-2 md:bg-transparent md:p-0">
        <h2 className="text-h3 md:text-h2">{t('greeting', { name: user.firstName })}</h2>
        <p className="text-body-sm text-text-secondary md:text-body">
          {today ? <><span className="md:hidden">{today.short}</span><span className="hidden md:inline">{today.long}</span> · </> : null}
          {cases.isLoading ? t('casesLoading') : t('activeCasesCount', { count: activeCases.length })}
        </p>
      </div>

      {/* Stat cards — 4 across on desktop, 2×2 on mobile */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
        <Stat label={t('stats.activeCases')} value={cases.isLoading ? null : String(activeCases.length)} href="/portal/cases" tone="new" icon={<StatCasesIcon />} />
        <Stat label={t('stats.unreadNotifications')} value={notifications.isLoading ? null : String(notifications.data?.unreadCount ?? 0)} href="/portal/notifications" tone="pending" icon={<StatNotificationsIcon />} />
        <Stat label={t('stats.unpaidInvoices')} value={invoices.isLoading ? null : String(openInvoices.length)} href="/portal/invoices" tone="danger" icon={<StatInvoiceIcon />} />
        <Stat label={t('stats.upcomingEvents')} value={eventsLoading || cases.isLoading ? null : String(upcomingAll.length)} href="/portal/cases" tone="progress" icon={<StatClockIcon />} />
      </div>

      {requestSummary.data && requestSummary.data.total > 0 && <DocumentRequestsCard summary={requestSummary.data} />}
      {messageSummary.data && messageSummary.data.total > 0 && <UnreadMessagesCard summary={messageSummary.data} />}
      {openServiceRequests.length > 0 && <ServiceRequestsCard requests={openServiceRequests} />}

      {/* My cases */}
      <section className="flex flex-col gap-4 md:gap-5">
        <SectionTitle title={t('myCases')} href="/portal/cases" allLabel={t('seeAll')} allLabelShort={t('seeAllShort')} />
        {cases.isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 md:gap-5"><CardSkeleton /><CardSkeleton /></div>
        ) : (cases.data?.items.length ?? 0) === 0 ? (
          <EmptyState title={t('noCasesTitle')} description={t('noCasesDescription')} />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 md:gap-5">
            {cases.data!.items.slice(0, 4).map((c) => {
              const next = upcomingAll.find((e) => e.caseItem.id === c.id);
              const footer = next
                ? `${NEXT_EVENT_KEYS.includes(next.type as (typeof NEXT_EVENT_KEYS)[number]) ? t(`nextEvent.${next.type}`) : tEvent(next.type)}: ${formatDateTime(next.eventDate, locale)}`
                : t('updatedAt', { date: formatDate(c.updatedAt, locale) });
              return <CaseCard key={c.id} caseNumber={c.caseNumber} title={c.title} status={CASE_STATUS_BADGE[c.status]} lawyer={c.lawyer} href={`/portal/cases/${c.id}`} footer={footer} />;
            })}
          </div>
        )}
      </section>

      {/* Panels: upcoming events + recent notifications (notifications panel is desktop-only, as in Figma) */}
      <div className="grid gap-6 md:grid-cols-2 md:gap-5">
        <section className="flex flex-col gap-3.5 md:gap-0">
          <h3 className="text-h4 md:hidden">{t('upcomingShort')}</h3>
          <Card className="flex flex-col md:gap-4 md:p-6">
            <h3 className="hidden text-h4 md:block">{t('upcoming')}</h3>
            {eventsLoading || cases.isLoading ? (
              <div className="flex flex-col gap-3 p-4 md:p-0"><Skeleton className="h-14" /><Skeleton className="h-14" /></div>
            ) : upcoming.length === 0 ? (
              <p className="p-4 text-body-sm text-text-secondary md:p-0">{t('noUpcoming')}</p>
            ) : (
              <ol className="flex flex-col divide-y divide-border-subtle md:divide-y-0">
                {upcoming.map((e) => {
                  const d = new Date(e.eventDate);
                  return (
                    <li key={e.id} className="flex items-center gap-3.5 p-4 md:gap-4 md:px-0 md:py-1">
                      <div className="flex size-[52px] shrink-0 flex-col items-center justify-center rounded-md bg-bg-brand-soft md:size-14" aria-hidden>
                        <span className="font-serif text-[20px] font-semibold leading-7 text-text-brand md:text-h4">{String(d.getDate()).padStart(2, '0')}</span>
                        <span className="text-caption text-text-muted">{formatMonthShort(d, locale)}</span>
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col gap-[3px] md:gap-1">
                        <Link href={`/portal/cases/${e.caseItem.id}`} className="focus-ring truncate rounded-sm text-body-sm-medium text-text-primary hover:text-text-brand">
                          {tEvent(e.type)} · {e.caseItem.caseNumber}
                        </Link>
                        <p className="text-caption text-text-secondary md:text-body-sm">{e.title}, {formatTime(e.eventDate, locale)}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </Card>
        </section>

        <Card className="hidden flex-col gap-3.5 p-6 md:flex">
          <SectionTitle title={t('recentNotifications')} href="/portal/notifications" size="h4" allLabel={t('seeAll')} allLabelShort={t('seeAllShort')} />
          {notifications.isLoading ? (
            <div className="flex flex-col gap-3"><Skeleton className="h-10" /><Skeleton className="h-10" /><Skeleton className="h-10" /></div>
          ) : recentNotifications.length === 0 ? (
            <p className="text-body-sm text-text-secondary">{t('noNotifications')}</p>
          ) : (
            <ul className="flex flex-col">
              {recentNotifications.map((n) => (
                <li key={n.id} className="flex items-start gap-3 py-1.5">
                  <span aria-hidden className={cn('mt-[7px] size-2 shrink-0 rounded-full', n.isRead ? 'bg-neutral-300' : 'bg-accent-default')} />
                  <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
                    <p className={cn('truncate text-body-sm-medium', n.isRead ? 'text-text-secondary' : 'text-text-primary')}>
                      {n.isRead ? n.title : <>{n.title}<span className="sr-only"> ({t('unreadLabel')})</span></>}
                    </p>
                    <p className="text-caption text-text-muted">{n.body} · {formatTimeAgo(n.createdAt, locale)}</p>
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
              <span className="md:hidden">{t('unpaidShort')}</span>
              <span className="hidden md:inline">{t('unpaid')}</span>
            </p>
            <p className="text-body-sm text-text-secondary md:text-body">
              {dueInvoice.invoiceNumber} · {formatMoney(dueInvoice.amount, locale)} · <span className="hidden md:inline">{t('dueDate')}</span><span className="md:hidden">{t('dueDateShort')}</span>: {formatDate(dueInvoice.dueDate, locale)}
              {openInvoices.length > 1 && <> · {t('invoiceTotal', { count: openInvoices.length })}</>}
            </p>
          </div>
          <div className="flex shrink-0 gap-3">
            <Button asChild variant="ghost" size="md" className="hidden md:inline-flex"><Link href={`/portal/invoices/${dueInvoice.id}`}>{t('details')}</Link></Button>
            <Button asChild variant="primary" size="md" className="w-full md:w-auto"><Link href={`/portal/invoices/${dueInvoice.id}`}>{t('payCta')}</Link></Button>
          </div>
        </div>
      ) : null}

      {/* Reported transfers still being confirmed — counted apart from unpaid invoices */}
      {awaitingInvoices.length > 0 && (
        <div role="status" className="flex flex-col gap-3 rounded-lg border-l-[3px] border-status-new-fg bg-status-new-bg p-5 md:flex-row md:items-center md:justify-between md:gap-6 md:px-7 md:py-6">
          <div className="flex flex-col gap-1.5">
            <p className="text-h4 text-status-new-fg">{t('confirmingTitle')}</p>
            <p className="text-body-sm text-text-secondary md:text-body">
              {awaitingInvoices.map((i) => `${i.invoiceNumber} · ${formatMoney(i.amount, locale)}`).join(' · ')} — {t('confirmingText')}
            </p>
          </div>
          <Button asChild variant="secondary" size="md" className="w-full shrink-0 md:w-auto">
            <Link href={`/portal/invoices/${awaitingInvoices[0].id}`}>{t('details')}</Link>
          </Button>
        </div>
      )}
    </div>
  );
}

/** "Танаас {n} баримт хүсэлттэй байна" — jumps to the case with the most open requests. */
function DocumentRequestsCard({ summary }: { summary: DocumentRequestSummary }) {
  const t = useTranslations('portal.dashboard');
  const [first] = summary.cases;
  if (!first) return null;
  return (
    <div role="status" className="flex flex-col gap-3 rounded-lg border-l-[3px] border-status-new-fg bg-status-new-bg p-5 md:flex-row md:items-center md:justify-between md:gap-6 md:px-7 md:py-6">
      <div className="flex min-w-0 flex-col gap-1.5">
        <p className="text-h4 text-status-new-fg">{t('documentRequests', { count: summary.total })}</p>
        <p className="text-body-sm text-text-secondary md:text-body">
          {summary.cases.map((item, index) => (
            <span key={item.caseId}>
              {index > 0 && ' · '}
              <Link href={`/portal/cases/${item.caseId}?tab=requests`} className="focus-ring rounded-sm text-text-primary hover:underline">{item.caseNumber}</Link>
              {`: ${t('documentsCount', { count: item.count })}`}
            </span>
          ))}
        </p>
      </div>
      <Button asChild size="md" className="w-full shrink-0 md:w-auto">
        <Link href={`/portal/cases/${first.caseId}?tab=requests`}>{t('sendDocuments')}</Link>
      </Button>
    </div>
  );
}

/** Unread messages — opens the chat of the case with the most unread messages. */
function UnreadMessagesCard({ summary }: { summary: MessageUnreadSummary }) {
  const t = useTranslations('portal.dashboard');
  const [first] = summary.cases;
  if (!first) return null;
  return (
    <div role="status" className="flex flex-col gap-3 rounded-lg border-l-[3px] border-status-progress-fg bg-status-progress-bg p-5 md:flex-row md:items-center md:justify-between md:gap-6 md:px-7 md:py-6">
      <div className="flex min-w-0 flex-col gap-1.5">
        <p className="text-h4 text-status-progress-fg">{t('unreadMessages', { count: summary.total })}</p>
        <p className="text-body-sm text-text-secondary md:text-body">
          {summary.cases.map((item, index) => (
            <span key={item.caseId}>
              {index > 0 && ' · '}
              <Link href={`/portal/cases/${item.caseId}?tab=messages`} className="focus-ring rounded-sm text-text-primary hover:underline">{item.caseNumber}</Link>
              {`: ${t('messagesCount', { count: item.count })}`}
            </span>
          ))}
        </p>
      </div>
      <Button asChild size="md" className="w-full shrink-0 md:w-auto">
        <Link href={`/portal/cases/${first.caseId}?tab=messages`}>{t('readMessages')}</Link>
      </Button>
    </div>
  );
}

/** "{n} хүсэлт шийдвэрлэгдэж байна" — requests still waiting for a decision or a lawyer. */
function ServiceRequestsCard({ requests }: { requests: ServiceRequestItem[] }) {
  const t = useTranslations('portal.dashboard');
  const tStatus = useTranslations('enums.serviceRequestStatus');
  return (
    <div role="status" className="flex flex-col gap-3 rounded-lg border-l-[3px] border-status-pending-fg bg-status-pending-bg p-5 md:flex-row md:items-center md:justify-between md:gap-6 md:px-7 md:py-6">
      <div className="flex min-w-0 flex-col gap-1.5">
        <p className="text-h4 text-status-pending-fg">{t('openRequests', { count: requests.length })}</p>
        <p className="text-body-sm text-text-secondary md:text-body">
          {requests.slice(0, 3).map((request) => `${request.title} (${tStatus(request.status)})`).join(' · ')}
        </p>
      </div>
      <Button asChild size="md" className="w-full shrink-0 md:w-auto">
        <Link href="/portal/requests">{t('viewRequests')}</Link>
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

function SectionTitle({ title, href, size = 'h3', allLabel, allLabelShort }: { title: string; href?: string; size?: 'h3' | 'h4'; allLabel: string; allLabelShort: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <h3 className={size === 'h3' ? 'text-h4 md:text-h3' : 'text-h4'}>{title}</h3>
      {href && (
        <Link href={href} className="focus-ring inline-flex min-h-11 items-center rounded-sm text-body-sm-medium text-text-accent hover:underline">
          <span className="md:hidden">{allLabelShort}</span>
          <span className="hidden md:inline">{allLabel}</span>
        </Link>
      )}
    </div>
  );
}
