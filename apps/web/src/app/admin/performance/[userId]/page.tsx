'use client';

import type { PerformancePeriod } from '@law-firm/shared/schemas';
import Link from 'next/link';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback } from 'react';
import { CompletionChart, MetricTiles, PerformanceNote, PeriodTabs } from '@/components/admin/performance-parts';
import { Avatar } from '@/components/ui/avatar';
import { Badge, StatusBadge, TASK_PRIORITY_BADGE, TASK_STATUS_BADGE } from '@/components/ui/badge';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CardSkeleton, ErrorState, Skeleton } from '@/components/ui/states';
import { ApiError } from '@/lib/api';
import { ROLE_LABELS, formatDate } from '@/lib/format';
import { parsePeriod, periodLabel, usePerformanceTimeline, usePerformanceUser } from '@/lib/performance';
import { TASK_PRIORITIES, TASK_STATUSES, isTaskOverdue } from '@/lib/tasks';
import { cn, initials, shortName } from '@/lib/utils';

function Breakdown({ title, note, entries }: { title: string; note: string; entries: { key: string; badge: React.ReactNode; count: number }[] }) {
  const max = Math.max(1, ...entries.map((entry) => entry.count));
  return (
    <Card className="flex flex-col gap-4 p-6">
      <div className="flex flex-col gap-1">
        <h3 className="text-h4">{title}</h3>
        <p className="text-caption text-text-muted">{note}</p>
      </div>
      <ul className="flex flex-col gap-3">
        {entries.map((entry) => (
          <li key={entry.key} className="grid grid-cols-[140px_1fr_32px] items-center gap-3">
            <span>{entry.badge}</span>
            <span aria-hidden className="h-2 overflow-hidden rounded-full bg-bg-surface-alt">
              <span className="block h-full rounded-full bg-brand-primary" style={{ width: `${(entry.count / max) * 100}%` }} />
            </span>
            <span className="text-right text-body-sm-medium text-text-primary">{entry.count}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function PerformanceUserContent() {
  const { userId } = useParams<{ userId: string }>();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const period = parsePeriod(searchParams.get('period'));
  const detail = usePerformanceUser(userId, period);
  const timeline = usePerformanceTimeline(period, userId);

  const setPeriod = useCallback(
    (next: PerformancePeriod) => router.replace(next === 'this-month' ? pathname : `${pathname}?period=${next}`, { scroll: false }),
    [pathname, router],
  );
  const backHref = `/admin/performance${period === 'this-month' ? '' : `?period=${period}`}`;

  if (detail.isError) {
    const err = detail.error;
    const forbidden = err instanceof ApiError && err.status === 403;
    return (
      <div className="flex flex-col gap-4">
        <Breadcrumb items={[{ label: 'Гүйцэтгэл', href: backHref }, { label: forbidden ? 'Хандах эрхгүй' : 'Олдсонгүй' }]} />
        <ErrorState
          title={forbidden ? '403 — Энэ ажилтны гүйцэтгэлийг харах эрх танд байхгүй' : '404 — Ажилтан олдсонгүй'}
          message={forbidden ? 'Та зөвхөн өөрийн болон тантай нэг хэргийн багт ажилладаг хүмүүсийн гүйцэтгэлийг харна.' : err instanceof ApiError ? err.message : 'Алдаа гарлаа'}
        />
        <div><Button asChild variant="secondary" size="sm"><Link href={backHref}>Гүйцэтгэл рүү буцах</Link></Button></div>
      </div>
    );
  }
  if (!detail.data) {
    return <div className="flex flex-col gap-6"><Skeleton className="h-4 w-48" /><Skeleton className="h-16 w-2/3" /><CardSkeleton /></div>;
  }

  const data = detail.data;
  const name = shortName(data.user.firstName, data.user.lastName);

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb items={[{ label: 'Гүйцэтгэл', href: backHref }, { label: name }]} />
      <div className="flex items-center gap-4">
        <Avatar size="lg" initials={initials(data.user.firstName, data.user.lastName)} src={data.user.avatarUrl} />
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="text-h3 md:text-h2">{name}{data.isSelf ? ' (Та)' : ''}</h2>
          <p className="text-body-sm text-text-secondary">{ROLE_LABELS[data.user.role]} · {data.metrics.caseCount} хэргийн багт</p>
        </div>
      </div>
      <PerformanceNote />
      <PeriodTabs value={period} onChange={setPeriod} />
      <MetricTiles metrics={data.metrics} period={period} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Breakdown
          title="Төлөвөөр"
          note={`Идэвхтэй төлөв — одоогийн байдлаар; Дууссан, Цуцалсан — ${periodLabel(period).toLowerCase()}`}
          entries={TASK_STATUSES.map((status) => ({ key: status, badge: <StatusBadge map={TASK_STATUS_BADGE} status={status} />, count: data.byStatus[status] }))}
        />
        <Breakdown
          title="Идэвхтэй даалгавар — ач холбогдлоор"
          note="Одоо хийгдэх ёстой ажлын ач холбогдол"
          entries={TASK_PRIORITIES.map((priority) => ({ key: priority, badge: <StatusBadge map={TASK_PRIORITY_BADGE} status={priority} />, count: data.byPriority[priority] }))}
        />
      </div>

      <Card className="flex flex-col gap-4 p-6">
        <h3 className="text-h4">Дууссан даалгавар</h3>
        <CompletionChart timeline={timeline.data} loading={timeline.isLoading} />
      </Card>

      <Card className="flex flex-col gap-4 p-6">
        <div className="flex flex-col gap-1">
          <h3 className="text-h4">Сүүлийн даалгавар</h3>
          <p className="text-caption text-text-muted">Зөвхөн танд нээх эрхтэй даалгаврууд харагдана.</p>
        </div>
        {data.recentTasks.length === 0 ? (
          <p className="text-body-sm text-text-muted">Танд харагдах даалгавар алга.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border-subtle">
            {data.recentTasks.map((task) => {
              const overdue = isTaskOverdue(task);
              return (
                <li key={task.id} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 md:flex-row md:items-center md:justify-between">
                  <div className="flex min-w-0 flex-col gap-1">
                    <Link href={`/admin/tasks/${task.id}`} className="focus-ring truncate rounded-sm text-body-sm-medium text-text-primary hover:text-text-brand hover:underline">{task.title}</Link>
                    <p className="text-caption text-text-muted">
                      {task.case ? task.case.caseNumber : 'Дотоод ажил'}
                      {task.dueDate && (
                        <>
                          {' · '}
                          <span className={cn(overdue && 'text-status-danger-fg')}>хугацаа {formatDate(task.dueDate)}</span>
                        </>
                      )}
                      {' · '}шинэчилсэн {formatDate(task.updatedAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <StatusBadge map={TASK_PRIORITY_BADGE} status={task.priority} />
                    <StatusBadge map={TASK_STATUS_BADGE} status={task.status} />
                    {overdue && <Badge tone="danger" dot={false}>Хугацаа хэтэрсэн</Badge>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}

export default function AdminPerformanceUserPage() {
  return (
    <Suspense fallback={<CardSkeleton />}>
      <PerformanceUserContent />
    </Suspense>
  );
}
