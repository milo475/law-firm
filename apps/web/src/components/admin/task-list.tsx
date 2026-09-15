'use client';

import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { Badge, StatusBadge, TASK_PRIORITY_BADGE, TASK_STATUS_BADGE } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '@/components/ui/table';
import { toast } from '@/components/ui/toast';
import { ApiError, api } from '@/lib/api';
import { formatDate } from '@/lib/format';
import {
  BOARD_STATUSES,
  canChangeTaskStatus,
  isForwardMove,
  isTaskOverdue,
  nextTaskStatuses,
  taskActionLabel,
  useInvalidateTasks,
  type TaskItem,
  type TaskStatus,
} from '@/lib/tasks';
import { cn, shortName } from '@/lib/utils';

type Viewer = { id: string; role: string };

const assigneeName = (task: TaskItem, viewer: Viewer) =>
  `${shortName(task.assignee.firstName, task.assignee.lastName)}${task.assigneeId === viewer.id ? ' (Та)' : ''}`;

export function useTaskStatusMutation() {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: ({ task, status }: { task: Pick<TaskItem, 'id'>; status: TaskStatus }) => api.patch<TaskItem>(`/tasks/${task.id}`, { status }),
    onSuccess: async (updated) => {
      toast.success('Төлөв өөрчлөгдлөө', `«${updated.title}» — ${TASK_STATUS_BADGE[updated.status].label}`);
      await invalidate();
    },
    onError: (error) => toast.danger('Төлөв сольж чадсангүй', error instanceof ApiError ? error.message : undefined),
  });
}

/** Status buttons the viewer may use (none for team members who only read the task). Tables show only the next step forward. */
export function TaskStatusActions({ task, viewer, forwardOnly = false, className }: { task: TaskItem; viewer: Viewer; forwardOnly?: boolean; className?: string }) {
  const change = useTaskStatusMutation();
  const targets = (canChangeTaskStatus(task, viewer) ? nextTaskStatuses(task.status) : []).filter((status) => !forwardOnly || isForwardMove(task.status, status));
  if (targets.length === 0) return null;
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {targets.map((status) => (
        <Button
          key={status}
          size="sm"
          variant={isForwardMove(task.status, status) ? 'secondary' : 'ghost'}
          disabled={change.isPending}
          onClick={() => change.mutate({ task, status })}
        >
          {taskActionLabel(task.status, status)}
        </Button>
      ))}
    </div>
  );
}

function DueDate({ task }: { task: TaskItem }) {
  if (!task.dueDate) return <span className="text-text-muted">—</span>;
  const overdue = isTaskOverdue(task);
  return (
    <span className={cn('flex flex-col whitespace-nowrap', overdue && 'text-body-sm-medium text-status-danger-fg')}>
      {formatDate(task.dueDate)}
      {overdue && <span className="text-caption">хугацаа хэтэрсэн</span>}
    </span>
  );
}

// Seven columns have to fit next to the sidebar, so cells use a tighter horizontal padding than the default.
const CELL = 'px-4';

/** Table on desktop, cards on mobile. Overdue rows are red. */
export function TaskTable({ tasks, viewer, showCase = true }: { tasks: TaskItem[]; viewer: Viewer; showCase?: boolean }) {
  return (
    <>
      <div className="hidden md:block">
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell className={CELL}>Даалгавар</TableHeaderCell>
              {showCase && <TableHeaderCell className={CELL}>Хэрэг</TableHeaderCell>}
              <TableHeaderCell className={CELL}>Гүйцэтгэгч</TableHeaderCell>
              <TableHeaderCell className={CELL}>Ач холбогдол</TableHeaderCell>
              <TableHeaderCell className={CELL}>Хугацаа</TableHeaderCell>
              <TableHeaderCell className={CELL}>Төлөв</TableHeaderCell>
              <TableHeaderCell className={cn(CELL, 'text-right')}>Үйлдэл</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tasks.map((task) => (
              <TableRow key={task.id} className={isTaskOverdue(task) ? 'bg-status-danger-bg' : undefined}>
                <TableCell className={cn(CELL, 'py-2')}>
                  <Link href={`/admin/tasks/${task.id}`} className="focus-ring block max-w-[240px] truncate rounded-sm text-body-sm-medium text-text-primary hover:text-text-brand hover:underline" title={task.title}>
                    {task.title}
                  </Link>
                  {task._count.comments > 0 && <span className="block text-caption text-text-muted">{task._count.comments} коммент</span>}
                </TableCell>
                {showCase && (
                  <TableCell className={cn(CELL, 'whitespace-nowrap')}>
                    {task.case ? (
                      <Link href={`/admin/cases/${task.case.id}?tab=tasks`} className="focus-ring rounded-sm text-text-accent hover:underline" title={task.case.title}>{task.case.caseNumber}</Link>
                    ) : (
                      <span className="text-text-muted">Дотоод</span>
                    )}
                  </TableCell>
                )}
                <TableCell className={cn(CELL, 'whitespace-nowrap')}>{assigneeName(task, viewer)}</TableCell>
                <TableCell className={cn(CELL, 'whitespace-nowrap')}><StatusBadge map={TASK_PRIORITY_BADGE} status={task.priority} /></TableCell>
                <TableCell className={CELL}><DueDate task={task} /></TableCell>
                <TableCell className={cn(CELL, 'whitespace-nowrap')}><StatusBadge map={TASK_STATUS_BADGE} status={task.status} /></TableCell>
                <TableCell className={cn(CELL, 'py-2')}><TaskStatusActions task={task} viewer={viewer} forwardOnly className="flex-nowrap justify-end" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <ul className="grid gap-3 md:hidden">
        {tasks.map((task) => (
          <li key={task.id}><TaskCard task={task} viewer={viewer} showCase={showCase} /></li>
        ))}
      </ul>
    </>
  );
}

export function TaskCard({ task, viewer, showCase = true, showStatus = true }: { task: TaskItem; viewer: Viewer; showCase?: boolean; showStatus?: boolean }) {
  const overdue = isTaskOverdue(task);
  return (
    <article aria-label={task.title} className={cn('flex flex-col gap-3 rounded-lg border border-border-default bg-bg-surface p-4', overdue && 'border-l-[3px] border-l-status-danger-fg')}>
      <div className="flex flex-wrap items-center gap-2">
        {showStatus && <StatusBadge map={TASK_STATUS_BADGE} status={task.status} />}
        <StatusBadge map={TASK_PRIORITY_BADGE} status={task.priority} />
        {overdue && <Badge tone="danger" dot={false}>Хугацаа хэтэрсэн</Badge>}
      </div>
      <Link href={`/admin/tasks/${task.id}`} className="focus-ring break-words rounded-sm text-body-medium text-text-primary hover:text-text-brand hover:underline">{task.title}</Link>
      <p className="text-caption text-text-muted">
        {showCase && `${task.case ? task.case.caseNumber : 'Дотоод'} · `}
        {assigneeName(task, viewer)}
        {task.dueDate && (
          <>
            {' · '}
            <span className={cn(overdue && 'text-body-sm-medium text-status-danger-fg')}>{formatDate(task.dueDate)}</span>
          </>
        )}
        {task._count.comments > 0 && ` · ${task._count.comments} коммент`}
      </p>
      <TaskStatusActions task={task} viewer={viewer} />
    </article>
  );
}

/** Kanban: one column per open/finished status; moves happen with the status buttons (no drag). */
export function TaskBoard({ tasks, viewer }: { tasks: TaskItem[]; viewer: Viewer }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {BOARD_STATUSES.map((status) => {
        const column = tasks.filter((task) => task.status === status);
        return (
          <section key={status} aria-label={TASK_STATUS_BADGE[status].label} className="flex min-w-0 flex-col gap-3 rounded-lg bg-bg-surface-alt p-3">
            <header className="flex items-center justify-between gap-2 px-1">
              <StatusBadge map={TASK_STATUS_BADGE} status={status} />
              <span className="text-body-sm-medium text-text-secondary" aria-label={`${column.length} даалгавар`}>{column.length}</span>
            </header>
            {column.length === 0 ? (
              <p className="px-1 py-6 text-center text-caption text-text-muted">Даалгавар алга</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {column.map((task) => (
                  <li key={task.id}><TaskCard task={task} viewer={viewer} showStatus={false} /></li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
