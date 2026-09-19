'use client';

import type { AdminStats } from '@law-firm/shared/schemas';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { AdminPageTitle } from '@/components/admin/admin-page-title';
import { StatTile } from '@/components/admin/stat-tile';
import { PlusIcon } from '@/components/icons';
import { useUser } from '@/components/portal/user-context';
import { CASE_STATUS_BADGE, SERVICE_REQUEST_STATUS_BADGE, StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/states';
import { ApiError, api, type CaseListItem, type Paginated, type ServiceRequestItem } from '@/lib/api';
import { CASE_EVENT_LABELS, SERVICE_REQUEST_TYPE_LABELS, formatDate, formatMoney } from '@/lib/format';
import { formatRate, usePerformanceOverview } from '@/lib/performance';
import { useServiceRequestSummary } from '@/lib/service-requests';
import { useTaskSummary } from '@/lib/tasks';
import { shortName } from '@/lib/utils';

export default function AdminDashboardPage() {
  const { user } = useUser();
  const isAdmin = user.role === 'ADMIN';

  const stats = useQuery({ queryKey: ['admin', 'stats'], queryFn: () => api.get<AdminStats>('/admin/stats') });
  const requests = useQuery({
    queryKey: ['service-requests', 'admin', 'dashboard'],
    queryFn: () => api.get<Paginated<ServiceRequestItem>>('/service-requests?status=NEW&limit=5'),
    enabled: isAdmin,
  });
  const requestSummary = useServiceRequestSummary(isAdmin);
  const recentCases = useQuery({
    queryKey: ['admin', 'cases', { limit: 5 }],
    queryFn: () => api.get<Paginated<CaseListItem>>('/cases?limit=5'),
  });

  const tasks = useTaskSummary();
  const team = usePerformanceOverview('this-month', isAdmin);

  const s = stats.data;

  return (
    <div className="flex flex-col gap-8">
      <AdminPageTitle
        title={`Сайн байна уу, ${user.firstName}`}
        description={isAdmin ? 'Фирмийн хэрэг, нэхэмжлэх, хүсэлтийн товч тойм.' : 'Таны хариуцсан хэргүүдийн товч тойм.'}
        actions={
          <Button asChild size="md">
            <Link href="/admin/cases/new"><PlusIcon size={18} />Шинэ хэрэг</Link>
          </Button>
        }
      />

      {stats.isError ? (
        <ErrorState message={stats.error instanceof ApiError ? stats.error.message : 'Статистик ачаалахад алдаа гарлаа'} onRetry={() => void stats.refetch()} />
      ) : isAdmin ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile
            label="Нийт хэрэг"
            value={s?.admin ? String(s.admin.totalCases) : null}
            hint={s?.admin ? `${s.admin.casesByStatus.IN_PROGRESS} явагдаж буй · ${s.admin.casesByStatus.NEW} шинэ` : undefined}
            href="/admin/cases"
          />
          <StatTile label="Идэвхтэй хуульч" value={s?.admin ? String(s.admin.activeLawyers) : null} href="/admin/lawyers" />
          <StatTile
            label="Энэ сарын нэхэмжлэх"
            value={s?.admin ? formatMoney(s.admin.invoicesThisMonth.total) : null}
            hint={s?.admin ? `${s.admin.invoicesThisMonth.count} нэхэмжлэх` : undefined}
            href="/admin/invoices"
          />
          <StatTile
            label="Шинэ хүсэлт"
            value={requestSummary.data ? String(requestSummary.data.new) : null}
            hint={requestSummary.data ? `${requestSummary.data.accepted} өмгөөлөгч хуваарилахыг хүлээж буй` : undefined}
            href="/admin/requests"
            tone={requestSummary.data && requestSummary.data.new > 0 ? 'accent' : undefined}
          />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatTile label="Нээлттэй хэрэг" value={s?.lawyer ? String(s.lawyer.openCases) : null} href="/admin/cases" />
          <StatTile label="Удахгүй болох (7 хоног)" value={s?.lawyer ? String(s.lawyer.upcomingEventCount) : null} />
          <StatTile
            label="Төлөгдөөгүй нэхэмжлэх"
            value={s?.lawyer ? formatMoney(s.lawyer.unpaidInvoiceTotal) : null}
            hint={s?.lawyer ? `${s.lawyer.unpaidInvoiceCount} нэхэмжлэх` : undefined}
            href="/admin/invoices"
            tone={s?.lawyer && s.lawyer.unpaidInvoiceCount > 0 ? 'danger' : undefined}
          />
        </div>
      )}

      {isAdmin && s?.admin && (
        <div className="flex flex-wrap gap-2" aria-label="Хэрэг төлөвөөр">
          {(['NEW', 'IN_PROGRESS', 'WAITING', 'CLOSED'] as const).map((status) => (
            <Link key={status} href={`/admin/cases?status=${status}`} className="focus-ring inline-flex items-center gap-2 rounded-full">
              <StatusBadge map={CASE_STATUS_BADGE} status={status} />
              <span className="text-body-sm-medium text-text-primary">{s.admin!.casesByStatus[status]}</span>
            </Link>
          ))}
        </div>
      )}

      <div className={isAdmin ? 'grid gap-4 sm:grid-cols-2 xl:grid-cols-4' : 'grid gap-4 sm:grid-cols-2'} aria-label="Даалгавар">
        <StatTile
          label="Миний идэвхтэй даалгавар"
          value={tasks.isError ? '—' : tasks.data ? String(tasks.data.active) : null}
          hint={tasks.data ? `${tasks.data.byStatus.TODO} хийх · ${tasks.data.byStatus.IN_PROGRESS} хийгдэж буй · ${tasks.data.byStatus.REVIEW} хянах` : undefined}
          href="/admin/tasks?scope=mine"
        />
        <StatTile
          label="Хугацаа хэтэрсэн даалгавар"
          value={tasks.isError ? '—' : tasks.data ? String(tasks.data.overdue) : null}
          hint="Надад оноогдсон, эцсийн хугацаа өнгөрсөн"
          href="/admin/tasks?scope=mine&overdue=true"
          tone={tasks.data && tasks.data.overdue > 0 ? 'danger' : undefined}
        />
        {isAdmin && (
          <>
            <StatTile
              label="Багийн идэвхтэй даалгавар"
              value={team.isError ? '—' : team.data ? String(team.data.activeTasks) : null}
              hint={team.data ? `${team.data.overdueTasks} хугацаа хэтэрсэн · ${team.data.people} ажилтан` : undefined}
              href="/admin/performance"
            />
            <StatTile
              label="Энэ сард дууссан"
              value={team.isError ? '—' : team.data ? String(team.data.completedTasks) : null}
              hint={team.data ? `Хугацаандаа: ${formatRate(team.data.onTimeRate)}` : undefined}
              href="/admin/performance"
            />
          </>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="flex flex-col gap-4 p-6">
          <h3 className="text-h4">Удахгүй болох үйл явдал</h3>
          {stats.isLoading ? (
            <Skeleton className="h-32" />
          ) : !s || s.upcomingEvents.length === 0 ? (
            <p className="text-body-sm text-text-muted">Ойрын 7 хоногт товлогдсон хурал, уулзалт байхгүй.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border-subtle">
              {s.upcomingEvents.map((event) => (
                <li key={event.id} className="flex items-start gap-4 py-3 first:pt-0 last:pb-0">
                  <div className="flex w-14 shrink-0 flex-col items-center rounded-md bg-bg-brand-soft py-2 text-text-brand">
                    <span className="font-serif text-h4">{new Date(event.eventDate).getDate()}</span>
                    <span className="text-caption">{new Date(event.eventDate).getMonth() + 1}-р сар</span>
                  </div>
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <p className="text-caption text-text-accent">{CASE_EVENT_LABELS[event.type] ?? event.type} · {formatDate(event.eventDate, 'mn', true)}</p>
                    <p className="text-body-sm-medium text-text-primary">{event.title}</p>
                    <Link href={`/admin/cases/${event.case.id}`} className="focus-ring -my-1 inline-flex min-h-10 items-center rounded-sm py-1 max-w-full truncate text-caption text-text-muted hover:text-text-brand">
                      {event.case.caseNumber} · {event.case.title}
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {isAdmin ? (
          <Card className="flex flex-col gap-4 p-6">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-h4">Шинэ хүсэлтүүд</h3>
              <Button asChild variant="ghost" size="sm"><Link href="/admin/requests">Бүгд →</Link></Button>
            </div>
            {requests.isLoading ? (
              <Skeleton className="h-32" />
            ) : requests.isError ? (
              <p className="text-body-sm text-status-danger-fg">Хүсэлт ачаалахад алдаа гарлаа.</p>
            ) : (requests.data?.items.length ?? 0) === 0 ? (
              <p className="text-body-sm text-text-muted">Шинэ хүсэлт алга.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-border-subtle">
                {requests.data!.items.map((item) => (
                  <li key={item.id} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <Link href={`/admin/requests/${item.id}`} className="focus-ring -my-1 inline-flex min-h-10 items-center rounded-sm py-1 text-body-sm-medium text-text-primary hover:text-text-brand hover:underline">{item.title}</Link>
                      <p className="truncate text-caption text-text-muted">
                        {shortName(item.requester.firstName, item.requester.lastName)} · {SERVICE_REQUEST_TYPE_LABELS[item.type]} · {formatDate(item.createdAt, 'mn', true)}
                      </p>
                    </div>
                    <StatusBadge map={SERVICE_REQUEST_STATUS_BADGE} status={item.status} />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        ) : (
          <Card className="flex flex-col gap-4 p-6">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-h4">Сүүлийн хэргүүд</h3>
              <Button asChild variant="ghost" size="sm"><Link href="/admin/cases">Бүгд →</Link></Button>
            </div>
            {recentCases.isLoading ? (
              <Skeleton className="h-32" />
            ) : (recentCases.data?.items.length ?? 0) === 0 ? (
              <EmptyState title="Хэрэг алга" description="Шинэ хэрэг үүсгэхэд энд харагдана." />
            ) : (
              <ul className="flex flex-col divide-y divide-border-subtle">
                {recentCases.data!.items.map((c) => (
                  <li key={c.id} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <Link href={`/admin/cases/${c.id}`} className="focus-ring -my-1 inline-flex min-h-10 items-center rounded-sm py-1 text-body-sm-medium text-text-primary hover:text-text-brand">{c.title}</Link>
                      <p className="text-caption text-text-muted">{c.caseNumber} · {shortName(c.client.firstName, c.client.lastName)}</p>
                    </div>
                    <StatusBadge map={CASE_STATUS_BADGE} status={c.status} />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
