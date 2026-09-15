'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { CreateInvoiceSchema } from '@law-firm/shared/schemas';
import { useMutation } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal, ModalContent } from '@/components/ui/modal';
import { Select, type SelectOption } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';
import { ApiError, api, type InvoiceItem } from '@/lib/api';
import { isoToLocalDate, localDateToIso } from '@/lib/admin';

const InvoiceFormSchema = CreateInvoiceSchema.extend({
  caseId: z.string().min(1, 'Хэрэг сонгоно уу'),
  dueDate: z.string().min(1, 'Төлөх хугацааг оруулна уу'),
});
type InvoiceFormInput = z.input<typeof InvoiceFormSchema>;
type InvoiceFormValues = z.output<typeof InvoiceFormSchema>;

const emptyValues = (caseId?: string, invoice?: InvoiceItem | null): InvoiceFormInput =>
  invoice
    ? { caseId: invoice.case.id, amount: String(Number(invoice.amount)), description: invoice.description, dueDate: isoToLocalDate(invoice.dueDate) }
    : { caseId: caseId ?? '', amount: '', description: '', dueDate: '' };

/**
 * Creates a DRAFT invoice (`caseId` locks it to one case, `caseOptions` lets the user pick),
 * or edits the amount / description / due date of a DRAFT `invoice` — the API refuses content edits after sending.
 */
export function InvoiceModal({ open, onOpenChange, caseId, caseOptions, invoice, onSaved }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId?: string;
  caseOptions?: SelectOption[];
  invoice?: InvoiceItem | null;
  onSaved: (invoice: InvoiceItem) => void;
}) {
  const editing = Boolean(invoice);
  const form = useForm<InvoiceFormInput, unknown, InvoiceFormValues>({
    resolver: zodResolver(InvoiceFormSchema),
    defaultValues: emptyValues(caseId, invoice),
  });

  useEffect(() => {
    if (open) form.reset(emptyValues(caseId, invoice));
  }, [open, caseId, invoice, form]);

  const save = useMutation({
    mutationFn: ({ caseId: selectedCaseId, ...values }: InvoiceFormValues) =>
      invoice
        ? api.patch<InvoiceItem>(`/invoices/${invoice.id}`, { ...values, dueDate: localDateToIso(values.dueDate) })
        : api.post<InvoiceItem>('/invoices', { ...values, caseId: selectedCaseId, dueDate: localDateToIso(values.dueDate) }),
    onSuccess: (saved) => {
      if (editing) toast.success('Нэхэмжлэх шинэчлэгдлээ', `${saved.invoiceNumber} · ноорог хэвээр. Илгээхэд харилцагчид шинэ дүн очно.`);
      else toast.success('Нэхэмжлэх үүслээ', `${saved.invoiceNumber} ноорог төлөвтэй хадгалагдлаа. Илгээхэд харилцагчид мэдэгдэл очно.`);
      onSaved(saved);
      onOpenChange(false);
    },
    onError: (error) => toast.danger(editing ? 'Нэхэмжлэх хадгалж чадсангүй' : 'Нэхэмжлэх үүсгэж чадсангүй', error instanceof ApiError ? error.message : undefined),
  });

  const { register, control, handleSubmit, formState: { errors } } = form;

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent
        title={invoice ? `${invoice.invoiceNumber} засах` : 'Шинэ нэхэмжлэх'}
        description={
          invoice
            ? 'Ноорог үед дүн, тайлбар, төлөх хугацааг засна. Харилцагчид илгээсний дараа өөрчлөх боломжгүй.'
            : 'Нэхэмжлэх ноорог төлөвтэй үүснэ. Шалгасны дараа «Илгээх» товчоор харилцагчид илгээнэ.'
        }
        footer={
          <>
            <Button variant="ghost" size="md" onClick={() => onOpenChange(false)} disabled={save.isPending}>Болих</Button>
            <Button size="md" type="submit" form="invoice-form" disabled={save.isPending}>{save.isPending ? 'Хадгалж байна…' : editing ? 'Хадгалах' : 'Үүсгэх'}</Button>
          </>
        }
      >
        <form id="invoice-form" onSubmit={handleSubmit((values) => save.mutate(values))} noValidate className="flex flex-col gap-5">
          {!caseId && !invoice && (
            <Controller
              control={control}
              name="caseId"
              render={({ field }) => (
                <Select label="Хэрэг" placeholder="Хэрэг сонгоно уу" options={caseOptions ?? []} value={field.value || undefined} onValueChange={field.onChange} error={errors.caseId?.message} required />
              )}
            />
          )}
          <div className="grid gap-5 sm:grid-cols-2">
            <Input label="Дүн (₮)" type="number" inputMode="decimal" min={0} step="0.01" placeholder="500000" required error={errors.amount?.message} {...register('amount')} />
            <Input label="Төлөх хугацаа" type="date" required error={errors.dueDate?.message} {...register('dueDate')} />
          </div>
          <Textarea label="Тайлбар" rows={3} placeholder="Жишээ: Шүүх хуралд төлөөлөх (1-р шат)" required error={errors.description?.message} {...register('description')} />
        </form>
      </ModalContent>
    </Modal>
  );
}
