'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { CreateTaskSchema, TaskPrioritySchema } from '@law-firm/shared/schemas';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { useCaseMembers, useStaffOptions } from '@/components/admin/queries';
import { useUser } from '@/components/portal/user-context';
import { TASK_PRIORITY_BADGE } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal, ModalContent } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';
import { ApiError, api, type CaseListItem, type Paginated } from '@/lib/api';
import { isoToLocalDate, localDateToIso } from '@/lib/admin';
import { TASK_PRIORITIES, useInvalidateTasks, type TaskItem } from '@/lib/tasks';
import { shortName } from '@/lib/utils';

const NO_CASE = 'NONE';
const today = () => isoToLocalDate(new Date().toISOString());

const FormSchema = z.object({
  title: CreateTaskSchema.shape.title,
  description: z.string().trim().max(5000, 'Тайлбар хэт урт байна'),
  caseId: z.string(),
  assigneeId: z.string().min(1, 'Гүйцэтгэгчээ сонгоно уу'),
  priority: TaskPrioritySchema,
  dueDate: z.string(),
});
type FormValues = z.infer<typeof FormSchema>;

/**
 * Create or edit a task. A lawyer picks one of their team cases and a teammate, or keeps the task internal
 * (then it is their own); an admin may assign any active lawyer or admin.
 */
export function TaskModal({ open, onOpenChange, task, presetCase, onSaved }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Edit this task (its case cannot change). */
  task?: TaskItem | null;
  /** Creating from a case page: the case is fixed. */
  presetCase?: { id: string; caseNumber: string; title: string };
  onSaved?: (task: TaskItem) => void;
}) {
  const { user } = useUser();
  const isAdmin = user.role === 'ADMIN';
  const editing = Boolean(task);
  const invalidate = useInvalidateTasks();

  const defaults = useMemo<FormValues>(
    () =>
      task
        ? { title: task.title, description: task.description ?? '', caseId: task.caseId ?? NO_CASE, assigneeId: task.assigneeId, priority: task.priority, dueDate: isoToLocalDate(task.dueDate) }
        : { title: '', description: '', caseId: presetCase?.id ?? NO_CASE, assigneeId: isAdmin ? '' : user.id, priority: 'MEDIUM', dueDate: '' },
    [task, presetCase?.id, isAdmin, user.id],
  );
  const form = useForm<FormValues>({ resolver: zodResolver(FormSchema), defaultValues: defaults });
  const { register, control, handleSubmit, reset, setValue, watch, formState: { errors } } = form;

  useEffect(() => {
    if (open) reset(defaults);
  }, [open, defaults, reset]);

  const caseFixed = editing || Boolean(presetCase);
  const cases = useQuery({
    queryKey: ['admin', 'cases', { limit: 100, purpose: 'task-options' }],
    queryFn: () => api.get<Paginated<CaseListItem>>('/cases?limit=100'),
    enabled: open && !caseFixed,
  });
  const caseId = watch('caseId');
  const selectedCaseId = caseId && caseId !== NO_CASE ? caseId : null;
  const members = useCaseMembers(selectedCaseId ?? '', open && !isAdmin && Boolean(selectedCaseId));
  const staff = useStaffOptions(open && isAdmin);

  const fixedCase = task?.case ?? presetCase ?? null;
  const caseOptions = useMemo(() => {
    const options = (cases.data?.items ?? [])
      .filter((item) => item.status !== 'CLOSED')
      .map((item) => ({ value: item.id, label: `${item.caseNumber} · ${item.title}` }));
    if (fixedCase && !options.some((option) => option.value === fixedCase.id)) {
      options.unshift({ value: fixedCase.id, label: `${fixedCase.caseNumber} · ${fixedCase.title}` });
    }
    return [{ value: NO_CASE, label: 'Хэрэггүй — дотоод ажил' }, ...options];
  }, [cases.data, fixedCase]);

  const assigneeOptions = useMemo(() => {
    if (isAdmin) return staff.data ?? [];
    if (!selectedCaseId) return [{ value: user.id, label: `${shortName(user.firstName, user.lastName)} (Та)` }];
    return (members.data ?? []).map((member) => ({
      value: member.userId,
      label: `${shortName(member.user.firstName, member.user.lastName)}${member.userId === user.id ? ' (Та)' : ''}${member.role === 'LEAD' ? ' · Ахлах' : ''}`,
    }));
  }, [isAdmin, staff.data, selectedCaseId, members.data, user.id, user.firstName, user.lastName]);

  // A lawyer's internal task is their own; switching cases drops an assignee who is not on the new team.
  const assigneeId = watch('assigneeId');
  const optionsReady = isAdmin ? staff.isSuccess : !selectedCaseId || members.isSuccess;
  useEffect(() => {
    if (!open || !optionsReady) return;
    if (!isAdmin && !selectedCaseId) {
      if (assigneeId !== user.id) setValue('assigneeId', user.id);
    } else if (assigneeId && !assigneeOptions.some((option) => option.value === assigneeId)) {
      setValue('assigneeId', '');
    }
  }, [open, optionsReady, isAdmin, selectedCaseId, assigneeId, assigneeOptions, user.id, setValue]);

  const save = useMutation({
    mutationFn: (values: FormValues) => {
      const description = values.description.trim();
      if (task) {
        return api.patch<TaskItem>(`/tasks/${task.id}`, {
          title: values.title,
          description: description || null,
          assigneeId: values.assigneeId,
          priority: values.priority,
          dueDate: values.dueDate ? localDateToIso(values.dueDate) : null,
        });
      }
      return api.post<TaskItem>('/tasks', {
        title: values.title,
        assigneeId: values.assigneeId,
        priority: values.priority,
        ...(description ? { description } : {}),
        ...(values.caseId !== NO_CASE ? { caseId: values.caseId } : {}),
        ...(values.dueDate ? { dueDate: localDateToIso(values.dueDate) } : {}),
      });
    },
    onSuccess: async (saved) => {
      if (editing) toast.success('Даалгавар шинэчлэгдлээ');
      else toast.success('Даалгавар үүслээ', saved.assigneeId !== user.id ? `${shortName(saved.assignee.firstName, saved.assignee.lastName)}-д мэдэгдэл очлоо.` : undefined);
      await invalidate();
      onSaved?.(saved);
      onOpenChange(false);
    },
    onError: (error) => toast.danger('Хадгалж чадсангүй', error instanceof ApiError ? error.message : undefined),
  });

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent
        size="lg"
        title={editing ? 'Даалгавар засах' : 'Шинэ даалгавар'}
        footer={
          <>
            <Button variant="ghost" size="md" onClick={() => onOpenChange(false)} disabled={save.isPending}>Болих</Button>
            <Button size="md" type="submit" form="task-form" disabled={save.isPending}>
              {save.isPending ? 'Хадгалж байна…' : editing ? 'Хадгалах' : 'Даалгавар үүсгэх'}
            </Button>
          </>
        }
      >
        <form id="task-form" onSubmit={handleSubmit((values) => save.mutate(values))} noValidate className="flex flex-col gap-5">
          <Input label="Гарчиг" required placeholder="Жишээ: Нэхэмжлэлийн төсөл бэлтгэх" error={errors.title?.message} {...register('title')} />
          <Textarea label="Тайлбар" rows={3} error={errors.description?.message} {...register('description')} />
          <div className="grid gap-5 sm:grid-cols-2">
            <Controller
              control={control}
              name="caseId"
              render={({ field }) => (
                <Select
                  label="Хэрэг"
                  options={caseOptions}
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={caseFixed}
                  helper={editing ? 'Даалгаврын хэргийг солих боломжгүй' : caseFixed || isAdmin ? undefined : 'Зөвхөн таны багт байгаа хэргүүд'}
                />
              )}
            />
            <Controller
              control={control}
              name="assigneeId"
              render={({ field }) => (
                <Select
                  label="Гүйцэтгэгч"
                  required
                  placeholder="Гүйцэтгэгч сонгоно уу"
                  options={assigneeOptions}
                  value={field.value || undefined}
                  onValueChange={field.onChange}
                  disabled={!isAdmin && !selectedCaseId}
                  error={errors.assigneeId?.message}
                  helper={isAdmin ? 'Аль ч идэвхтэй ажилтанд оноож болно' : selectedCaseId ? 'Хэргийн багийн гишүүд' : 'Дотоод ажлыг зөвхөн өөртөө үүсгэнэ'}
                />
              )}
            />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Controller
              control={control}
              name="priority"
              render={({ field }) => (
                <Select label="Ач холбогдол" options={TASK_PRIORITIES.map((priority) => ({ value: priority, label: TASK_PRIORITY_BADGE[priority].label }))} value={field.value} onValueChange={field.onChange} />
              )}
            />
            <Input label="Эцсийн хугацаа" type="date" min={editing ? undefined : today()} error={errors.dueDate?.message} {...register('dueDate')} />
          </div>
        </form>
      </ModalContent>
    </Modal>
  );
}
