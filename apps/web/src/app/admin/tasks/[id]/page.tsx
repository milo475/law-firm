'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { CreateTaskCommentSchema } from '@law-firm/shared/schemas';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import { ConfirmModal } from '@/components/admin/confirm-modal';
import { TaskAttachmentsCard } from '@/components/admin/task-attachments-card';
import { TaskStatusActions, useTaskStatusMutation } from '@/components/admin/task-list';
import { TaskModal } from '@/components/admin/task-modal';
import { useUser } from '@/components/portal/user-context';
import { Avatar } from '@/components/ui/avatar';
import { Badge, StatusBadge, TASK_PRIORITY_BADGE, TASK_STATUS_BADGE } from '@/components/ui/badge';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CardSkeleton, ErrorState, Skeleton } from '@/components/ui/states';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';
import { ApiError, api } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { TASKS_KEY, TASK_SUMMARY_KEY, isTaskOverdue, taskKey, useInvalidateTasks, type TaskCommentItem, type TaskDetail } from '@/lib/tasks';
import { cn, initials, shortName } from '@/lib/utils';

type CommentValues = z.infer<typeof CreateTaskCommentSchema>;

export default function AdminTaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useUser();
  const router = useRouter();
  const queryClient = useQueryClient();
  const invalidate = useInvalidateTasks();
  const detail = useQuery({ queryKey: taskKey(id), queryFn: () => api.get<TaskDetail>(`/tasks/${id}`), retry: false });
  const [editOpen, setEditOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const changeStatus = useTaskStatusMutation();

  const remove = useMutation({
    mutationFn: () => api.delete(`/tasks/${id}`),
    onSuccess: async () => {
      toast.success('Даалгавар устгагдлаа');
      setDeleteOpen(false);
      // Mark lists stale without refetching this (now missing) task while we navigate away.
      await queryClient.invalidateQueries({ queryKey: TASKS_KEY, refetchType: 'none' });
      void queryClient.invalidateQueries({ queryKey: TASK_SUMMARY_KEY });
      router.push('/admin/tasks');
    },
    onError: (error) => toast.danger('Устгаж чадсангүй', error instanceof ApiError ? error.message : undefined),
  });

  if (detail.isError) {
    const err = detail.error;
    const forbidden = err instanceof ApiError && err.status === 403;
    return (
      <div className="flex flex-col gap-4">
        <Breadcrumb items={[{ label: 'Даалгавар', href: '/admin/tasks' }, { label: forbidden ? 'Хандах эрхгүй' : 'Олдсонгүй' }]} />
        <ErrorState
          title={forbidden ? '403 — Энэ даалгаврыг үзэх эрх танд байхгүй' : '404 — Даалгавар олдсонгүй'}
          message={forbidden ? 'Танд оноогдсон, таны үүсгэсэн эсвэл багийн хэргийн даалгаврыг л нээнэ.' : err instanceof ApiError ? err.message : 'Алдаа гарлаа'}
        />
        <div><Button asChild variant="secondary" size="sm"><Link href="/admin/tasks">Даалгавар руу буцах</Link></Button></div>
      </div>
    );
  }
  if (!detail.data) {
    return <div className="flex flex-col gap-6"><Skeleton className="h-4 w-48" /><Skeleton className="h-10 w-2/3" /><CardSkeleton /></div>;
  }

  const task = detail.data;
  const overdue = isTaskOverdue(task);
  const { canEdit, canDelete, canChangeStatus } = task.permissions;

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb items={[{ label: 'Даалгавар', href: '/admin/tasks' }, { label: task.title }]} />

      <div className="flex flex-col gap-4">
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge map={TASK_STATUS_BADGE} status={task.status} />
            <StatusBadge map={TASK_PRIORITY_BADGE} status={task.priority} />
            {overdue && <Badge tone="danger" dot={false}>Хугацаа хэтэрсэн</Badge>}
          </div>
          <h2 className="break-words text-h3 md:text-h2">{task.title}</h2>
          <p className="text-body-sm text-text-secondary">
            {task.case ? (
              <Link href={`/admin/cases/${task.case.id}?tab=tasks`} className="focus-ring rounded-sm text-text-accent hover:underline">{task.case.caseNumber} · {task.case.title}</Link>
            ) : (
              'Дотоод ажил'
            )}
            {' '}· үүсгэсэн {shortName(task.createdBy.firstName, task.createdBy.lastName)}, {formatDate(task.createdAt)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <TaskStatusActions task={task} viewer={user} />
          {canChangeStatus && task.status !== 'CANCELLED' && <Button variant="ghost" size="sm" onClick={() => setCancelOpen(true)}>Цуцлах</Button>}
          {canEdit && <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)}>Засах</Button>}
          {canDelete && <Button variant="ghost" size="sm" onClick={() => setDeleteOpen(true)}>Устгах</Button>}
        </div>
      </div>
      {!canChangeStatus && (
        <p className="rounded-md bg-bg-surface-alt px-4 py-3 text-body-sm text-text-secondary">
          Та энэ даалгаврыг харж, коммент бичих боломжтой. Төлөвийг гүйцэтгэгч, үүсгэсэн хүн эсвэл админ өөрчилнө.
        </p>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="flex min-w-0 flex-col gap-6">
          <Card className="flex flex-col gap-3 p-6">
            <h3 className="text-h4">Тайлбар</h3>
            {task.description ? (
              <p className="whitespace-pre-wrap break-words text-body text-text-secondary">{task.description}</p>
            ) : (
              <p className="text-body-sm text-text-muted">Тайлбар оруулаагүй.</p>
            )}
          </Card>
          <TaskAttachmentsCard taskId={task.id} viewer={user} />
          <CommentsCard task={task} onAdded={invalidate} />
        </div>
        <Card className="flex h-fit flex-col p-5">
          <dl className="flex flex-col gap-4">
            <DetailRow label="Гүйцэтгэгч">{shortName(task.assignee.firstName, task.assignee.lastName)}{task.assigneeId === user.id ? ' (Та)' : ''}</DetailRow>
            <DetailRow label="Үүсгэсэн">{shortName(task.createdBy.firstName, task.createdBy.lastName)}</DetailRow>
            <DetailRow label="Эцсийн хугацаа">
              <span className={cn(overdue && 'text-status-danger-fg')}>{task.dueDate ? formatDate(task.dueDate) : 'Тогтоогоогүй'}{overdue ? ' · хэтэрсэн' : ''}</span>
            </DetailRow>
            {task.completedAt && <DetailRow label="Дууссан">{formatDate(task.completedAt, true)}</DetailRow>}
            <DetailRow label="Сүүлд шинэчилсэн">{formatDate(task.updatedAt, true)}</DetailRow>
          </dl>
        </Card>
      </div>

      <TaskModal open={editOpen} onOpenChange={setEditOpen} task={task} />
      <ConfirmModal
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Даалгавар цуцлах"
        description={`«${task.title}» даалгаврыг цуцлах уу? Цуцалсан даалгаврыг дахин нээх боломжгүй.`}
        confirmLabel="Цуцлах"
        variant="danger"
        pending={changeStatus.isPending}
        onConfirm={() => changeStatus.mutate({ task, status: 'CANCELLED' }, { onSuccess: () => setCancelOpen(false) })}
      />
      <ConfirmModal
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Даалгавар устгах"
        description={`«${task.title}» даалгавар болон түүний коммент бүр мөсөн устна.`}
        confirmLabel="Устгах"
        variant="danger"
        pending={remove.isPending}
        onConfirm={() => remove.mutate()}
      />
    </div>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-caption text-text-muted">{label}</dt>
      <dd className="text-body-sm-medium text-text-primary">{children}</dd>
    </div>
  );
}

function CommentsCard({ task, onAdded }: { task: TaskDetail; onAdded: () => Promise<void> }) {
  const form = useForm<CommentValues>({ resolver: zodResolver(CreateTaskCommentSchema), defaultValues: { body: '' } });
  const add = useMutation({
    mutationFn: (values: CommentValues) => api.post<TaskCommentItem>(`/tasks/${task.id}/comments`, values),
    onSuccess: async () => {
      form.reset({ body: '' });
      toast.success('Коммент нэмэгдлээ');
      await onAdded();
    },
    onError: (error) => toast.danger('Коммент илгээж чадсангүй', error instanceof ApiError ? error.message : undefined),
  });

  return (
    <Card className="flex flex-col gap-5 p-6">
      <h3 className="text-h4">Коммент ({task.comments.length})</h3>
      {task.comments.length === 0 ? (
        <p className="text-body-sm text-text-muted">Коммент алга. Явц, асуултаа энд бичээрэй.</p>
      ) : (
        <ol className="flex flex-col gap-4">
          {task.comments.map((comment) => (
            <li key={comment.id} className="flex gap-3">
              <Avatar size="sm" initials={initials(comment.author.firstName, comment.author.lastName)} src={comment.author.avatarUrl} />
              <div className="flex min-w-0 flex-1 flex-col gap-1 rounded-lg bg-bg-surface-alt px-4 py-3">
                <p className="text-caption text-text-muted">
                  <span className="text-body-sm-medium text-text-primary">{shortName(comment.author.firstName, comment.author.lastName)}</span> · {formatDate(comment.createdAt, true)}
                </p>
                <p className="whitespace-pre-wrap break-words text-body-sm text-text-primary">{comment.body}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
      <form onSubmit={form.handleSubmit((values) => add.mutate(values))} noValidate className="flex flex-col gap-3">
        <Textarea label="Коммент бичих" rows={3} maxLength={2000} error={form.formState.errors.body?.message} {...form.register('body')} />
        <div><Button type="submit" size="md" disabled={add.isPending}>{add.isPending ? 'Илгээж байна…' : 'Илгээх'}</Button></div>
      </form>
    </Card>
  );
}
