'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { DocumentRequestItemSchema } from '@law-firm/shared/schemas';
import { useMutation } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod';
import { PlusIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Modal, ModalContent } from '@/components/ui/modal';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';
import { ApiError, api, type DocumentRequestItem } from '@/lib/api';
import { isoToLocalDate, localDateToIso } from '@/lib/admin';

const MAX_ROWS = 20;
const EMPTY_ROW = { title: '', description: '', isRequired: true, dueDate: '' };
const today = () => isoToLocalDate(new Date().toISOString());

/** Shared item schema with form-friendly description / date strings. New rows cannot be due in the past. */
function buildSchema(allowPastDueDate: boolean) {
  const dueDate = allowPastDueDate
    ? z.string()
    : z.string().refine((value) => !value || value >= today(), 'Эцсийн хугацаа өнөөдрөөс хойш байна');
  return z.object({
    items: z
      .array(
        DocumentRequestItemSchema.extend({
          description: z.string().trim().max(2000, 'Заавар хэт урт байна'),
          isRequired: z.boolean(),
          dueDate,
        }),
      )
      .min(1, 'Хамгийн багадаа нэг баримт нэмнэ үү')
      .max(MAX_ROWS, 'Нэг удаад 20-оос ихгүй баримт хүсэх боломжтой'),
  });
}
type FormValues = z.infer<ReturnType<typeof buildSchema>>;

export function DocumentRequestModal({ open, onOpenChange, caseId, request, onSaved }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
  /** When given, the modal edits this one request instead of creating a checklist. */
  request?: DocumentRequestItem | null;
  onSaved: () => void;
}) {
  const editing = Boolean(request);
  const schema = useMemo(() => buildSchema(editing), [editing]);
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { items: [EMPTY_ROW] } });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'items' });

  useEffect(() => {
    if (!open) return;
    form.reset({
      items: request
        ? [{ title: request.title, description: request.description ?? '', isRequired: request.isRequired, dueDate: isoToLocalDate(request.dueDate) }]
        : [EMPTY_ROW],
    });
  }, [open, request, form]);

  const save = useMutation({
    mutationFn: (values: FormValues) => {
      const rows = values.items.map((row) => ({
        title: row.title,
        description: row.description.trim() || null,
        isRequired: row.isRequired,
        dueDate: row.dueDate ? localDateToIso(row.dueDate) : null,
      }));
      if (request) return api.patch(`/document-requests/${request.id}`, rows[0]);
      return api.post(`/cases/${caseId}/document-requests`, {
        items: rows.map((row) => ({
          title: row.title,
          isRequired: row.isRequired,
          ...(row.description ? { description: row.description } : {}),
          ...(row.dueDate ? { dueDate: row.dueDate } : {}),
        })),
      });
    },
    onSuccess: (_data, values) => {
      if (editing) toast.success('Хүсэлт шинэчлэгдлээ');
      else toast.success(`${values.items.length} баримт хүслээ`, 'Харилцагчид мэдэгдэл очлоо.');
      onSaved();
      onOpenChange(false);
    },
    onError: (error) => toast.danger('Хадгалж чадсангүй', error instanceof ApiError ? error.message : undefined),
  });

  const { register, control, handleSubmit, formState: { errors } } = form;

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent
        size="lg"
        title={editing ? 'Баримтын хүсэлт засах' : 'Баримт хүсэх'}
        footer={
          <>
            <Button variant="ghost" size="md" onClick={() => onOpenChange(false)} disabled={save.isPending}>Болих</Button>
            <Button size="md" type="submit" form="document-request-form" disabled={save.isPending}>
              {save.isPending ? 'Хадгалж байна…' : editing ? 'Хадгалах' : fields.length > 1 ? `${fields.length} баримт хүсэх` : 'Хүсэлт илгээх'}
            </Button>
          </>
        }
      >
        <form id="document-request-form" onSubmit={handleSubmit((values) => save.mutate(values))} noValidate className="flex flex-col gap-4">
          <ol className="flex flex-col gap-4">
            {fields.map((field, index) => {
              const rowErrors = errors.items?.[index];
              return (
                <li key={field.id} className="flex flex-col gap-4 rounded-lg border border-border-default p-4 md:p-5">
                  {!editing && (
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-overline text-text-accent">Баримт {index + 1}</span>
                      {fields.length > 1 && (
                        <Button type="button" variant="ghost" size="sm" onClick={() => remove(index)} aria-label={`${index + 1}-р баримтыг жагсаалтаас хасах`}>Хасах</Button>
                      )}
                    </div>
                  )}
                  <Input label="Баримтын нэр" placeholder="Жишээ: Иргэний үнэмлэхний хуулбар" required error={rowErrors?.title?.message} {...register(`items.${index}.title`)} />
                  <Textarea label="Нэмэлт заавар" rows={2} placeholder="Жишээ: Хоёр талын тод хуулбар, PDF эсвэл JPG" error={rowErrors?.description?.message} {...register(`items.${index}.description`)} />
                  <div className="grid gap-4 sm:grid-cols-2 sm:items-center">
                    <Input label="Эцсийн хугацаа" type="date" min={editing ? undefined : today()} error={rowErrors?.dueDate?.message} {...register(`items.${index}.dueDate`)} />
                    <Controller
                      control={control}
                      name={`items.${index}.isRequired`}
                      render={({ field: checkbox }) => (
                        <Checkbox label="Заавал шаардлагатай" checked={checkbox.value} onCheckedChange={(value) => checkbox.onChange(value === true)} className="sm:mt-7" />
                      )}
                    />
                  </div>
                </li>
              );
            })}
          </ol>
          {errors.items?.message && <p role="alert" className="text-body-sm text-status-danger-fg">{errors.items.message}</p>}
          {!editing && fields.length < MAX_ROWS && (
            <div>
              <Button type="button" variant="secondary" size="sm" onClick={() => append(EMPTY_ROW)}><PlusIcon size={16} />Өөр баримт нэмэх</Button>
            </div>
          )}
          {!editing && (
            <p className="rounded-md bg-bg-brand-soft px-4 py-3 text-body-sm text-text-brand">
              Илгээхэд харилцагчид нэг мэдэгдэл очиж, хүсэлтүүд порталд жагсаалт хэлбэрээр харагдана.
            </p>
          )}
        </form>
      </ModalContent>
    </Modal>
  );
}
