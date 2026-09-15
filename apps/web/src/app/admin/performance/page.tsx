'use client';

import type { PerformancePeriod, PerformanceUserRow } from '@law-firm/shared/schemas';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useState } from 'react';
import { AdminPageTitle } from '@/components/admin/admin-page-title';
import { CompletionChart, MetricTiles, PerformanceNote, PeriodTabs } from '@/components/admin/performance-parts';
import { useUser } from '@/components/portal/user-context';
import { Avatar } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { EmptyState, ErrorState, TableSkeleton } from '@/components/ui/states';
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '@/components/ui/table';
import { ApiError } from '@/lib/api';
import { ROLE_LABELS } from '@/lib/format';
import { formatRate, parsePeriod, periodLabel, usePerformanceByUser, usePerformanceOverview, usePerformanceTimeline } from '@/lib/performance';
import { cn, initials, shortName } from '@/lib/utils';

type SortKey = 'name' | 'activeTasks' | 'completedTasks' | 'overdueTasks' | 'onTimeRate' | 'caseCount';
const COLUMNS: { key: SortKey; label: string }[] = [
  { key: 'name', label: 'Ажилтан' },
  { key: 'activeTasks', label: 'Идэвхтэй' },
  { key: 'completedTasks', label: 'Дууссан' },
  { key: 'overdueTasks', label: 'Хугацаа хэтэрсэн' },
  { key: 'onTimeRate', label: 'Хугацаандаа' },
  { key: 'caseCount', label: 'Хэрэг' },
];

const personName = (row: PerformanceUserRow) => shortName(row.user.firstName, row.user.lastName);

/** Numbers sort high → low on the first click, names A → Я; people without an on-time rate stay last either way. */
function sortRows(rows: PerformanceUserRow[], key: SortKey, direction: 'asc' | 'desc'): PerformanceUserRow[] {
  const factor = direction === 'asc' ? 1 : -1;
  const byName = (a: PerformanceUserRow, b: PerformanceUserRow) => `${a.user.lastName} ${a.user.firstName}`.localeCompare(`${b.user.lastName} ${b.user.firstName}`, 'mn');
  return [...rows].sort((a, b) => {
    if (key === 'name') return factor * byName(a, b);
    const av = a[key];
    const bv = b[key];
    if (av === null && bv === null) return byName(a, b);
    if (av === null) return 1;
    if (bv === null) return -1;
    return factor * (av - bv) || byName(a, b);
  });
}

function PerformanceContent() {
  const { user } = useUser();
  const isAdmin = user.role === 'ADMIN';
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const period = parsePeriod(searchParams.get('period'));
  const [sort, setSort] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({ key: 'name', direction: 'asc' });

  const setPeriod = useCallback(
    (next: PerformancePeriod) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next === 'this-month') params.delete('period');
      else params.set('period', next);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const overview = usePerformanceOverview(period);
  const people = usePerformanceByUser(period);
  const timeline = usePerformanceTimeline(period);
  const rows = sortRows(people.data?.items ?? [], sort.key, sort.direction);
  const detailHref = (row: PerformanceUserRow) => `/admin/performance/${row.user.id}${period === 'this-month' ? '' : `?period=${period}`}`;

  function toggleSort(key: SortKey) {
    setSort((current) => (current.key === key ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' } : { key, direction: key === 'name' ? 'asc' : 'desc' }));
  }

  const error = overview.error ?? people.error;

  return (
    <div className="flex flex-col gap-6">
      <AdminPageTitle
        title={isAdmin ? 'Гүйцэтгэл' : 'Миний болон багийн гүйцэтгэл'}
        description={
          isAdmin
            ? 'Фирмийн бүх хуульч, админы даалгаврын ачаалал ба явц.'
            : 'Та болон тантай нэг хэргийн багт ажилладаг хамтрагчдын даалгаврын ачаалал ба явц.'
        }
      />
      <PerformanceNote />
      <PeriodTabs value={period} onChange={setPeriod} />

      {error ? (
        <ErrorState message={error instanceof ApiError ? error.message : 'Гүйцэтгэлийн мэдээлэл ачаалахад алдаа гарлаа'} onRetry={() => { void overview.refetch(); void people.refetch(); }} />
      ) : (
        <>
          <section aria-label="Тойм" className="flex flex-col gap-3">
            <p className="text-body-sm text-text-muted">
              {overview.data ? `${overview.data.scope === 'organization' ? 'Байгууллага' : 'Та ба багийн хамтрагчид'} · ${overview.data.people} хүн · ${periodLabel(period)}` : ' '}
            </p>
            <MetricTiles metrics={overview.data} period={period} />
          </section>

          <Card className="flex flex-col gap-4 p-6">
            <h3 className="text-h4">Дууссан даалгавар</h3>
            <CompletionChart timeline={timeline.data} loading={timeline.isLoading} />
          </Card>

          <section aria-label="Хүн бүрээр" className="flex flex-col gap-3">
            <h3 className="text-h4">Хүн бүрээр</h3>
            {people.isLoading ? (
              <TableSkeleton rows={4} />
            ) : rows.length === 0 ? (
              <EmptyState title="Харагдах ажилтан алга" />
            ) : (
              <>
                <div className="hidden md:block">
                  <Table>
                    <TableHead>
                      <TableRow>
                        {COLUMNS.map((column) => {
                          const active = sort.key === column.key;
                          return (
                            <TableHeaderCell
                              key={column.key}
                              aria-sort={active ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
                              className={column.key === 'name' ? undefined : 'text-right'}
                            >
                              <button type="button" onClick={() => toggleSort(column.key)} className="focus-ring inline-flex items-center gap-1 rounded-sm hover:text-text-primary">
                                {column.label}
                                <span aria-hidden className={cn('text-caption', !active && 'invisible')}>{sort.direction === 'asc' ? '↑' : '↓'}</span>
                              </button>
                            </TableHeaderCell>
                          );
                        })}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {rows.map((row) => (
                        <TableRow key={row.user.id} interactive onClick={() => router.push(detailHref(row))} className={cn('cursor-pointer', row.isSelf && 'bg-bg-brand-soft')}>
                          <TableCell className="py-2">
                            <div className="flex items-center gap-3">
                              <Avatar size="sm" initials={initials(row.user.firstName, row.user.lastName)} src={row.user.avatarUrl} />
                              <div className="flex min-w-0 flex-col">
                                <Link href={detailHref(row)} onClick={(event) => event.stopPropagation()} className="focus-ring rounded-sm text-body-sm-medium text-text-primary hover:text-text-brand hover:underline">
                                  {personName(row)}{row.isSelf ? ' (Та)' : ''}
                                </Link>
                                <span className="text-caption text-text-muted">{ROLE_LABELS[row.user.role]}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right text-body-sm-medium text-text-primary">{row.activeTasks}</TableCell>
                          <TableCell className="text-right">{row.completedTasks}</TableCell>
                          <TableCell className={cn('text-right', row.overdueTasks > 0 && 'text-body-sm-medium text-status-danger-fg')}>{row.overdueTasks}</TableCell>
                          <TableCell className="text-right" title={row.completedWithDueDate ? `${row.completedOnTime} / ${row.completedWithDueDate}` : 'Хугацаатай дууссан даалгавар алга'}>{formatRate(row.onTimeRate)}</TableCell>
                          <TableCell className="text-right">{row.caseCount}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <ul className="grid gap-3 md:hidden">
                  {rows.map((row) => (
                    <li key={row.user.id}>
                      <Link href={detailHref(row)} className={cn('focus-ring flex flex-col gap-3 rounded-lg border border-border-default bg-bg-surface p-4', row.isSelf && 'bg-bg-brand-soft')}>
                        <span className="flex items-center gap-3">
                          <Avatar size="sm" initials={initials(row.user.firstName, row.user.lastName)} src={row.user.avatarUrl} />
                          <span className="flex flex-col">
                            <span className="text-body-sm-medium text-text-primary">{personName(row)}{row.isSelf ? ' (Та)' : ''}</span>
                            <span className="text-caption text-text-muted">{ROLE_LABELS[row.user.role]} · {row.caseCount} хэрэг</span>
                          </span>
                        </span>
                        <span className="grid grid-cols-4 gap-2 text-center">
                          {[
                            ['Идэвхтэй', String(row.activeTasks), false],
                            ['Дууссан', String(row.completedTasks), false],
                            ['Хэтэрсэн', String(row.overdueTasks), row.overdueTasks > 0],
                            ['Хугацаандаа', formatRate(row.onTimeRate), false],
                          ].map(([label, value, danger]) => (
                            <span key={label as string} className="flex flex-col gap-0.5">
                              <span className={cn('text-body-medium', danger ? 'text-status-danger-fg' : 'text-text-primary')}>{value}</span>
                              <span className="text-caption text-text-muted">{label}</span>
                            </span>
                          ))}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        </>
      )}
    </div>
  );
}

export default function AdminPerformancePage() {
  return (
    <Suspense fallback={<TableSkeleton rows={5} />}>
      <PerformanceContent />
    </Suspense>
  );
}
