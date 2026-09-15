'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { CreateCaseEventSchema } from '@law-firm/shared/schemas';
import { useMutation } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Modal, ModalContent } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';
import { ApiError, api, type CaseEvent } from '@/lib/api';
import { MANUAL_EVENT_TYPES, isoToLocalDateTime, localDateTimeToIso } from '@/lib/admin';
import { CASE_EVENT_LABELS } from '@/lib/format';

// Shared schema, with the date as the raw datetime-local string and plain-string description for the form.
const EventFormSchema = CreateCaseEventSchema.extend({
  description: z.string().trim().max(4000, 'Тайлбар хэт урт байна'),
  eventDate: z.string().min(1, 'Огноо, цагаа оруулна уу'),
  isVisibleToClient: z.boolean(),
});
type EventFormValues = z.infer<typeof EventFormSchema>;

const TYPE_OPTIONS = MANUAL_EVENT_TYPES.map((type) => ({ value: type, label: CASE_EVENT_LABELS[type] }));
const NOTIFY_TYPES = new Set(['HEARING', 'MEETING', 'DEADLINE']);

export function EventModal({ open, onOpenChange, caseId, event, onSaved }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
  /** When given, the modal edits this event. */
  event?: CaseEvent | null;
  onSaved: () => void;
}) {
  const editing = Boolean(event);
  const form = useForm<EventFormValues>({
    resolver: zodResolver(EventFormSchema),
    defaultValues: { type: 'HEARING', title: '', description: '', eventDate: '', isVisibleToClient: true },
  });

  useEffect(() => {
    if (!open) return;
    form.reset(
      event
        ? {
            type: (MANUAL_EVENT_TYPES as string[]).includes(event.type) ? (event.type as EventFormValues['type']) : 'NOTE',
            title: event.title,
            description: event.description ?? '',
            eventDate: isoToLocalDateTime(event.eventDate),
            isVisibleToClient: event.isVisibleToClient ?? true,
          }
        : { type: 'HEARING', title: '', description: '', eventDate: '', isVisibleToClient: true },
    );
  }, [open, event, form]);

  const save = useMutation({
    mutationFn: (values: EventFormValues) => {
      const payload = { ...values, description: values.description.trim() || null, eventDate: localDateTimeToIso(values.eventDate) };
      return event ? api.patch(`/events/${event.id}`, payload) : api.post(`/cases/${caseId}/events`, payload);
    },
    onSuccess: (_data, values) => {
      const notified = !editing && values.isVisibleToClient && NOTIFY_TYPES.has(values.type);
      toast.success(editing ? 'Үйл явдал шинэчлэгдлээ' : 'Үйл явдал нэмэгдлээ', notified ? 'Харилцагчид мэдэгдэл илгээгдлээ.' : undefined);
      onSaved();
      onOpenChange(false);
    },
    onError: (error) => toast.danger('Хадгалж чадсангүй', error instanceof ApiError ? error.message : undefined),
  });

  const { register, control, handleSubmit, watch, formState: { errors } } = form;
  const type = watch('type');
  const visible = watch('isVisibleToClient');

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent
        title={editing ? 'Үйл явдал засах' : 'Үйл явдал нэмэх'}
        footer={
          <>
            <Button variant="ghost" size="md" onClick={() => onOpenChange(false)} disabled={save.isPending}>Болих</Button>
            <Button size="md" type="submit" form="event-form" disabled={save.isPending}>{save.isPending ? 'Хадгалж байна…' : 'Хадгалах'}</Button>
          </>
        }
      >
        <form id="event-form" onSubmit={handleSubmit((values) => save.mutate(values))} noValidate className="flex flex-col gap-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Controller
              control={control}
              name="type"
              render={({ field }) => (
                <Select label="Төрөл" options={TYPE_OPTIONS} value={field.value} onValueChange={field.onChange} error={errors.type?.message} required />
              )}
            />
            <Input label="Огноо, цаг" type="datetime-local" required error={errors.eventDate?.message} {...register('eventDate')} />
          </div>
          <Input label="Гарчиг" placeholder="Жишээ: Анхан шатны шүүх хурал" required error={errors.title?.message} {...register('title')} />
          <Textarea label="Тайлбар" rows={3} placeholder="Байршил, бэлтгэх баримт г.м." error={errors.description?.message} {...register('description')} />
          <Controller
            control={control}
            name="isVisibleToClient"
            render={({ field }) => (
              <Checkbox label="Харилцагчид харагдана" checked={field.value} onCheckedChange={(v) => field.onChange(v === true)} />
            )}
          />
          {!editing && visible && NOTIFY_TYPES.has(type) && (
            <p className="rounded-md bg-bg-brand-soft px-4 py-3 text-body-sm text-text-brand">Хадгалахад харилцагчид мэдэгдэл автоматаар очно.</p>
          )}
        </form>
      </ModalContent>
    </Modal>
  );
}
