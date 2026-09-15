'use client';

import { DndContext, KeyboardSensor, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { DragHandleIcon } from '@/components/icons';
import { Badge, StatusBadge, TASK_PRIORITY_BADGE, TASK_STATUS_BADGE } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '@/components/ui/table';
import { toast } from '@/components/ui/toast';
import { ApiError, api, type Paginated } from '@/lib/api';
import { formatDate } from '@/lib/format';
import {
  BOARD_STATUSES,
  TASKS_KEY,
  canChangeTaskStatus,
  canMoveTask,
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

export function TaskCard({ task, viewer, showCase = true, showStatus = true, dragHandle }: { task: TaskItem; viewer: Viewer; showCase?: boolean; showStatus?: boolean; dragHandle?: React.ReactNode }) {
  const overdue = isTaskOverdue(task);
  return (
    <article aria-label={task.title} className={cn('flex flex-col gap-3 rounded-lg border border-border-default bg-bg-surface p-4', overdue && 'border-l-[3px] border-l-status-danger-fg')}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {showStatus && <StatusBadge map={TASK_STATUS_BADGE} status={task.status} />}
          <StatusBadge map={TASK_PRIORITY_BADGE} status={task.priority} />
          {overdue && <Badge tone="danger" dot={false}>Хугацаа хэтэрсэн</Badge>}
        </div>
        {dragHandle}
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

/** Moves a task on the board: the card changes column at once and snaps back if the API refuses. */
export function useTaskMoveMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ task, status }: { task: TaskItem; status: TaskStatus }) => api.patch<TaskItem>(`/tasks/${task.id}`, { status }),
    onMutate: async ({ task, status }) => {
      await queryClient.cancelQueries({ queryKey: TASK_LISTS_KEY });
      const previous = queryClient.getQueriesData<Paginated<TaskItem>>({ queryKey: TASK_LISTS_KEY });
      queryClient.setQueriesData<Paginated<TaskItem>>({ queryKey: TASK_LISTS_KEY }, (data) =>
        data ? { ...data, items: data.items.map((item) => (item.id === task.id ? { ...item, status } : item)) } : data,
      );
      return { previous };
    },
    onError: (error, _vars, context) => {
      for (const [key, data] of context?.previous ?? []) queryClient.setQueryData(key, data);
      toast.danger('Төлөв сольж чадсангүй', error instanceof ApiError ? error.message : undefined);
    },
    onSuccess: (updated) => toast.success('Төлөв өөрчлөгдлөө', `«${updated.title}» — ${TASK_STATUS_BADGE[updated.status].label}`),
    onSettled: () => queryClient.invalidateQueries({ queryKey: TASKS_KEY }),
  });
}

const TASK_LISTS_KEY = ['tasks', 'list'] as const;
const statusLabel = (status: TaskStatus) => TASK_STATUS_BADGE[status].label;

function BoardColumn({ status, count, activeTask, viewer, children }: {
  status: TaskStatus;
  count: number;
  activeTask: TaskItem | null;
  viewer: Viewer;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const target = activeTask && activeTask.status !== status;
  const allowed = !target || (canChangeTaskStatus(activeTask, viewer) && canMoveTask(activeTask.status, status));
  return (
    <section
      ref={setNodeRef}
      aria-label={statusLabel(status)}
      className={cn(
        'flex min-w-0 flex-col gap-3 rounded-lg bg-bg-surface-alt p-3 transition-[background-color,box-shadow,opacity]',
        target && allowed && 'ring-2 ring-border-brand',
        target && allowed && isOver && 'bg-bg-brand-soft',
        target && !allowed && 'opacity-60',
      )}
    >
      <header className="flex items-center justify-between gap-2 px-1">
        <StatusBadge map={TASK_STATUS_BADGE} status={status} />
        <span className="text-body-sm-medium text-text-secondary" aria-label={`${count} даалгавар`}>{count}</span>
      </header>
      {children}
    </section>
  );
}

function DraggableCard({ task, viewer }: { task: TaskItem; viewer: Viewer }) {
  const draggable = canChangeTaskStatus(task, viewer);
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id, disabled: !draggable });
  return (
    <div
      ref={setNodeRef}
      style={transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined}
      className={cn('relative', isDragging && 'z-20 opacity-90 shadow-menu')}
    >
      <TaskCard
        task={task}
        viewer={viewer}
        showStatus={false}
        dragHandle={
          draggable ? (
            <button
              type="button"
              {...attributes}
              {...listeners}
              aria-label={`«${task.title}» даалгаврыг өөр багана руу чирэх`}
              className="focus-ring -m-1.5 inline-flex size-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-sm text-text-muted hover:bg-bg-surface-alt hover:text-text-secondary active:cursor-grabbing"
            >
              <DragHandleIcon size={18} />
            </button>
          ) : null
        }
      />
    </div>
  );
}

/**
 * Kanban: one column per open/finished status. A card is dragged by its handle to another column (pointer or keyboard);
 * the move is checked against the transition map and the viewer's rights first. The status buttons stay as the plain way.
 */
export function TaskBoard({ tasks, viewer }: { tasks: TaskItem[]; viewer: Viewer }) {
  const move = useTaskMoveMutation();
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor));
  const activeTask = tasks.find((task) => task.id === activeId) ?? null;

  function onDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const task = tasks.find((item) => item.id === event.active.id);
    const target = event.over?.id as TaskStatus | undefined;
    if (!task || !target || target === task.status) return;
    if (!canChangeTaskStatus(task, viewer)) {
      toast.danger('Төлөв солих эрхгүй', 'Төлөвийг гүйцэтгэгч, үүсгэсэн хүн эсвэл админ өөрчилнө.');
      return;
    }
    if (!canMoveTask(task.status, target)) {
      toast.danger('Энэ шилжилт боломжгүй', `«${statusLabel(task.status)}» төлөвөөс «${statusLabel(target)}» руу шууд шилжүүлэх боломжгүй.`);
      return;
    }
    move.mutate({ task, status: target });
  }

  return (
    <DndContext
      id="task-board"
      sensors={sensors}
      onDragStart={(event: DragStartEvent) => setActiveId(String(event.active.id))}
      onDragCancel={() => setActiveId(null)}
      onDragEnd={onDragEnd}
      accessibility={{
        screenReaderInstructions: {
          draggable: 'Даалгаврыг авахын тулд Space дарна. Сумаар өөр багана руу зөөгөөд Space дарж буулгана. Escape цуцална.',
        },
        announcements: {
          onDragStart: ({ active }) => `«${tasks.find((task) => task.id === active.id)?.title ?? ''}» даалгаврыг авлаа.`,
          onDragOver: ({ over }) => (over ? `«${statusLabel(over.id as TaskStatus)}» баганын дээр байна.` : 'Баганаас гадуур байна.'),
          onDragEnd: ({ over }) => (over ? `«${statusLabel(over.id as TaskStatus)}» баганад буулгалаа.` : 'Буулгасангүй.'),
          onDragCancel: () => 'Чирэхийг цуцаллаа.',
        },
      }}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {BOARD_STATUSES.map((status) => {
          const column = tasks.filter((task) => task.status === status);
          return (
            <BoardColumn key={status} status={status} count={column.length} activeTask={activeTask} viewer={viewer}>
              {column.length === 0 ? (
                <p className="px-1 py-6 text-center text-caption text-text-muted">Даалгавар алга</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {column.map((task) => (
                    <li key={task.id}><DraggableCard task={task} viewer={viewer} /></li>
                  ))}
                </ul>
              )}
            </BoardColumn>
          );
        })}
      </div>
    </DndContext>
  );
}
