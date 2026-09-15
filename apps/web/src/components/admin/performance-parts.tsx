'use client';

import type { PerformanceMetrics, PerformancePeriod, PerformanceTimeline } from '@law-firm/shared/schemas';
import { StatTile } from '@/components/admin/stat-tile';
import { Skeleton } from '@/components/ui/states';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PERIOD_OPTIONS, formatRate, periodLabel } from '@/lib/performance';
import { cn } from '@/lib/utils';

/** Period switch; the page keeps the value in the URL. */
export function PeriodTabs({ value, onChange }: { value: PerformancePeriod; onChange: (period: PerformancePeriod) => void }) {
  return (
    <Tabs value={value} onValueChange={(next) => onChange(next as PerformancePeriod)}>
      <TabsList aria-label="Хугацааны хүрээ">
        {PERIOD_OPTIONS.map((option) => (
          <TabsTrigger key={option.value} value={option.value}>{option.label}</TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

/** Reminder that these are workload counts, not a score. */
export function PerformanceNote() {
  return (
    <p className="rounded-md bg-bg-surface-alt px-4 py-3 text-body-sm text-text-secondary">
      Энэ бол даалгаврын ачаалал, явцын зураглал — хүнийг үнэлэх оноо биш. Системд бүртгэгдээгүй ажил эдгээр тоонд орохгүй.
    </p>
  );
}

/** Four neutral tiles; only overdue turns red, and only when there is something overdue. */
export function MetricTiles({ metrics, period }: { metrics: PerformanceMetrics | undefined; period: PerformancePeriod }) {
  const value = (n: number | undefined) => (n === undefined ? null : String(n));
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatTile label="Идэвхтэй даалгавар" value={value(metrics?.activeTasks)} hint="Одоогийн ачаалал (Хийх, Хийгдэж буй, Хянах)" />
      <StatTile label="Дууссан" value={value(metrics?.completedTasks)} hint={`${periodLabel(period)} дууссан`} />
      <StatTile
        label="Хугацаа хэтэрсэн"
        value={value(metrics?.overdueTasks)}
        hint="Идэвхтэй, эцсийн хугацаа өнгөрсөн"
        tone={metrics && metrics.overdueTasks > 0 ? 'danger' : undefined}
      />
      <StatTile
        label="Хугацаандаа биелүүлсэн"
        value={metrics ? formatRate(metrics.onTimeRate) : null}
        hint={
          metrics
            ? metrics.completedWithDueDate > 0
              ? `${metrics.completedOnTime} / ${metrics.completedWithDueDate} хугацаатай даалгавар`
              : 'Хугацаатай дууссан даалгавар алга'
            : undefined
        }
      />
    </div>
  );
}

/** Light bar chart of completed tasks; the numbers are also in a screen-reader table. */
export function CompletionChart({ timeline, loading }: { timeline: PerformanceTimeline | undefined; loading: boolean }) {
  if (loading || !timeline) return <Skeleton className="h-44" />;
  const buckets = timeline.buckets;
  const total = buckets.reduce((sum, bucket) => sum + bucket.completed, 0);
  const max = Math.max(1, ...buckets.map((bucket) => bucket.completed));
  const unit = timeline.granularity === 'day' ? 'өдрөөр' : 'сараар';
  if (buckets.length === 0) return <p className="text-body-sm text-text-muted">Энэ хугацаанд дууссан даалгавар алга.</p>;

  return (
    <figure className="flex flex-col gap-3">
      <div aria-hidden className="flex h-40 items-end gap-[3px]">
        {buckets.map((bucket) => (
          <div key={bucket.key} className="flex h-full min-w-0 flex-1 flex-col justify-end" title={`${bucket.label}: ${bucket.completed}`}>
            <div
              className={cn('w-full rounded-t-sm', bucket.completed > 0 ? 'bg-brand-primary' : 'bg-bg-surface-alt')}
              style={{ height: bucket.completed > 0 ? `${Math.max(6, (bucket.completed / max) * 100)}%` : '3px' }}
            />
          </div>
        ))}
      </div>
      <div aria-hidden className="flex justify-between gap-3 text-caption text-text-muted">
        <span>{buckets[0].label}</span>
        {buckets.length > 2 && <span>{buckets[Math.floor(buckets.length / 2)].label}</span>}
        <span>{buckets[buckets.length - 1].label}</span>
      </div>
      <figcaption className="text-caption text-text-muted">
        Дууссан даалгавар {unit} · нийт {total}{total > 0 ? ` · нэг ${timeline.granularity === 'day' ? 'өдөрт' : 'сард'} хамгийн ихдээ ${max}` : ''}
      </figcaption>
      <table className="sr-only">
        <caption>Дууссан даалгавар {unit}</caption>
        <thead><tr><th scope="col">Хугацаа</th><th scope="col">Дууссан</th></tr></thead>
        <tbody>
          {buckets.map((bucket) => (
            <tr key={bucket.key}><td>{bucket.label}</td><td>{bucket.completed}</td></tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
