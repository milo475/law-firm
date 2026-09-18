'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useState } from 'react';
import { AdminPageTitle } from '@/components/admin/admin-page-title';
import { TaskBoard, TaskTable } from '@/components/admin/task-list';
import { TaskModal } from '@/components/admin/task-modal';
import { PlusIcon } from '@/components/icons';
import { useUser } from '@/components/portal/user-context';
import { Badge, TASK_PRIORITY_BADGE, TASK_STATUS_BADGE } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Pagination } from '@/components/ui/pagination';
import { Select } from '@/components/ui/select';
import { EmptyState, ErrorState, TableSkeleton } from '@/components/ui/states';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ApiError, api, type CaseListItem, type Paginated } from '@/lib/api';
import { BOARD_STATUSES, TASK_PRIORITIES, TASK_STATUSES, taskListKey, useTaskSummary, type TaskItem } from '@/lib/tasks';

const ALL = 'ALL';
const PAGE_SIZE = 20;
const BOARD_LIMIT = 100;
const SORTS = [
  { value: 'dueDate', label: 'Хугацаагаар' },
  { value: 'priority', label: 'Ач холбогдлоор' },
  { value: 'createdAt', label: 'Шинэ нь эхэнд' },
];

function AdminTasksContent() {
  const { user } = useUser();
  const isAdmin = user.role === 'ADMIN';
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [createOpen, setCreateOpen] = useState(false);

  const view = searchParams.get('view') === 'board' ? 'board' : 'list';
  const scope = searchParams.get('scope') === 'mine' ? 'mine' : ALL;
  const status = searchParams.get('status') ?? '';
  const priority = searchParams.get('priority') ?? '';
  const caseId = searchParams.get('caseId') ?? '';
  const overdue = searchParams.get('overdue') === 'true';
  const sortParam = searchParams.get('sort');
  const sort = SORTS.some((option) => option.value === sortParam) ? sortParam! : 'dueDate';
  const page = Math.max(1, Number(searchParams.get('page')) || 1);

  const setParams = useCallback(
    (updates: Record<string, string>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value && value !== ALL) next.set(key, value);
        else next.delete(key);
      }
      if (!('page' in updates)) next.delete('page');
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  // The board shows every open and finished task at once, so it ignores the status filter and paging.
  const query = new URLSearchParams({ page: view === 'board' ? '1' : String(page), limit: String(view === 'board' ? BOARD_LIMIT : PAGE_SIZE), sort });
  if (scope === 'mine') query.set('scope', 'mine');
  if (status && view === 'list') query.set('status', status);
  if (priority) query.set('priority', priority);
  if (caseId) query.set('caseId', caseId);
  if (overdue) query.set('overdue', 'true');
  const qs = query.toString();

  const tasks = useQuery({
    queryKey: taskListKey(qs),
    queryFn: () => api.get<Paginated<TaskItem>>(`/tasks?${qs}`),
    placeholderData: keepPreviousData,
  });
  const summary = useTaskSummary();
  const caseOptions = useQuery({
    queryKey: ['admin', 'cases', { limit: 100, purpose: 'task-options' }],
    queryFn: () => api.get<Paginated<CaseListItem>>('/cases?limit=100'),
    select: (data) => data.items.map((item) => ({ value: item.id, label: `${item.caseNumber} · ${item.title}` })),
  });

  const filtered = scope !== ALL || Boolean(status && view === 'list') || Boolean(priority) || Boolean(caseId) || overdue;
  const data = tasks.data;
  const errorState = (
    <ErrorState message={tasks.error instanceof ApiError ? tasks.error.message : 'Даалгавар ачаалахад алдаа гарлаа'} onRetry={() => void tasks.refetch()} />
  );

  return (
    <div className="flex flex-col gap-6">
      <AdminPageTitle
        title="Даалгавар"
        description={isAdmin ? 'Фирмийн ажилтнуудын бүх даалгавар. Харилцагчид харагдахгүй.' : 'Танд оноогдсон, таны үүсгэсэн болон багийн хэргүүдийн даалгавар.'}
        actions={<Button size="md" onClick={() => setCreateOpen(true)}><PlusIcon size={18} />Шинэ даалгавар</Button>}
      />

      {summary.data && (
        <div className="flex flex-wrap items-center gap-3 text-body-sm text-text-secondary">
          <span>
            Надад оноогдсон идэвхтэй: <span className="text-body-sm-medium text-text-primary">{summary.data.active}</span>
          </span>
          {summary.data.overdue > 0 && (
            <button type="button" className="focus-ring rounded-full" onClick={() => setParams({ scope: 'mine', overdue: 'true' })}>
              <Badge tone="danger">{summary.data.overdue} хугацаа хэтэрсэн</Badge>
            </button>
          )}
        </div>
      )}

      <Tabs value={view} onValueChange={(value) => setParams({ view: value === 'board' ? 'board' : '' })}>
        <TabsList>
          <TabsTrigger value="list">Жагсаалт</TabsTrigger>
          <TabsTrigger value="board">Самбар</TabsTrigger>
        </TabsList>

        <div className="grid gap-3 pt-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <Select
            label="Хамрах хүрээ"
            value={scope}
            onValueChange={(value) => setParams({ scope: value === 'mine' ? 'mine' : '' })}
            options={[{ value: ALL, label: isAdmin ? 'Бүх даалгавар' : 'Миний харах бүх' }, { value: 'mine', label: 'Надад оноогдсон' }]}
          />
          {view === 'list' && (
            <Select
              label="Төлөв"
              value={status || ALL}
              onValueChange={(value) => setParams({ status: value })}
              options={[{ value: ALL, label: 'Бүх төлөв' }, ...TASK_STATUSES.map((item) => ({ value: item, label: TASK_STATUS_BADGE[item].label }))]}
            />
          )}
          <Select
            label="Ач холбогдол"
            value={priority || ALL}
            onValueChange={(value) => setParams({ priority: value })}
            options={[{ value: ALL, label: 'Бүгд' }, ...TASK_PRIORITIES.map((item) => ({ value: item, label: TASK_PRIORITY_BADGE[item].label }))]}
          />
          <Select label="Хэрэг" value={caseId || ALL} onValueChange={(value) => setParams({ caseId: value })} options={[{ value: ALL, label: 'Бүх хэрэг' }, ...(caseOptions.data ?? [])]} />
          <Select label="Эрэмбэ" value={sort} onValueChange={(value) => setParams({ sort: value === 'dueDate' ? '' : value })} options={SORTS} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <Checkbox label="Зөвхөн хугацаа хэтэрсэн" checked={overdue} onCheckedChange={(value) => setParams({ overdue: value === true ? 'true' : '' })} />
          {filtered && (
            <Button variant="ghost" size="sm" onClick={() => router.replace(view === 'board' ? `${pathname}?view=board` : pathname, { scroll: false })}>
              Шүүлтүүр цэвэрлэх
            </Button>
          )}
        </div>

        <TabsContent value="list">
          {tasks.isError ? (
            errorState
          ) : !data ? (
            <TableSkeleton rows={6} />
          ) : data.items.length === 0 ? (
            <EmptyState title="Даалгавар алга" description={filtered ? 'Шүүлтүүрт тохирох даалгавар олдсонгүй.' : '«Шинэ даалгавар» товчоор эхний даалгавраа үүсгээрэй.'} />
          ) : (
            <div className="flex flex-col gap-4">
              <TaskTable tasks={data.items} viewer={user} />
              <Pagination className="justify-center" page={data.page} totalPages={data.totalPages} onPageChange={(next) => setParams({ page: String(next) })} />
            </div>
          )}
        </TabsContent>
        <TabsContent value="board">
          {tasks.isError ? (
            errorState
          ) : !data ? (
            <TableSkeleton rows={4} />
          ) : (
            <div className="flex flex-col gap-3">
              {data.total > BOARD_LIMIT && <p className="text-caption text-text-muted">Самбарт эхний {BOARD_LIMIT} даалгавар харагдаж байна — шүүлтүүрээр нарийсгана уу.</p>}
              <TaskBoard tasks={data.items.filter((task) => BOARD_STATUSES.includes(task.status))} viewer={user} />
            </div>
          )}
        </TabsContent>
      </Tabs>

      <TaskModal open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

export default function AdminTasksPage() {
  return (
    <Suspense fallback={<TableSkeleton rows={6} />}>
      <AdminTasksContent />
    </Suspense>
  );
}
