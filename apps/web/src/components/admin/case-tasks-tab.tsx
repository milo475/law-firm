'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { TaskTable } from '@/components/admin/task-list';
import { TaskModal } from '@/components/admin/task-modal';
import { PlusIcon } from '@/components/icons';
import { useUser } from '@/components/portal/user-context';
import { TASK_STATUS_BADGE } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/states';
import { ApiError, api, type Paginated } from '@/lib/api';
import { TASK_STATUSES, isTaskActive, isTaskOverdue, taskListKey, type TaskItem, type TaskStatus } from '@/lib/tasks';

type Filter = 'ACTIVE' | 'ALL' | TaskStatus;
const FILTER_OPTIONS = [
  { value: 'ACTIVE', label: 'Идэвхтэй' },
  { value: 'ALL', label: 'Бүх төлөв' },
  ...TASK_STATUSES.map((status) => ({ value: status, label: TASK_STATUS_BADGE[status].label })),
];

/** "Даалгавар" tab: work for the case team. Tasks are never shown to the client. */
export function CaseTasksTab({ caseRef }: { caseRef: { id: string; caseNumber: string; title: string } }) {
  const { user } = useUser();
  const [filter, setFilter] = useState<Filter>('ACTIVE');
  const [createOpen, setCreateOpen] = useState(false);
  const query = `caseId=${caseRef.id}&limit=100&sort=dueDate`;
  const tasks = useQuery({ queryKey: taskListKey(query), queryFn: () => api.get<Paginated<TaskItem>>(`/tasks?${query}`) });

  const all = tasks.data?.items ?? [];
  const visible = filter === 'ALL' ? all : filter === 'ACTIVE' ? all.filter(isTaskActive) : all.filter((task) => task.status === filter);
  const active = all.filter(isTaskActive).length;
  const overdue = all.filter((task) => isTaskOverdue(task)).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <p className="min-w-0 flex-1 text-body-sm text-text-secondary">Хэргийн багийн гишүүдэд даалгавар оноож, явцыг хянана. Даалгавар харилцагчид харагдахгүй.</p>
        <Button size="sm" className="shrink-0 self-start" onClick={() => setCreateOpen(true)}><PlusIcon size={16} />Даалгавар нэмэх</Button>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <Select wrapperClassName="w-full sm:w-[220px]" label="Төлөв" value={filter} onValueChange={(value) => setFilter(value as Filter)} options={FILTER_OPTIONS} />
        {all.length > 0 && (
          <p className="text-caption text-text-muted">
            Нийт {all.length} · идэвхтэй {active}
            {overdue > 0 && <span className="text-status-danger-fg"> · хугацаа хэтэрсэн {overdue}</span>}
          </p>
        )}
      </div>
      {tasks.isError ? (
        <ErrorState message={tasks.error instanceof ApiError ? tasks.error.message : 'Алдаа гарлаа'} onRetry={() => void tasks.refetch()} />
      ) : tasks.isLoading ? (
        <Skeleton className="h-32" />
      ) : visible.length === 0 ? (
        <EmptyState
          title={all.length === 0 ? 'Даалгавар алга' : 'Энэ төлөвтэй даалгавар алга'}
          description={all.length === 0 ? '«Даалгавар нэмэх» товчоор багийн гишүүдэд ажил хуваарилаарай.' : undefined}
        />
      ) : (
        <TaskTable tasks={visible} viewer={user} showCase={false} />
      )}
      <TaskModal open={createOpen} onOpenChange={setCreateOpen} presetCase={caseRef} />
    </div>
  );
}
