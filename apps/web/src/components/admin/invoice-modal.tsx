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
import { localDateToIso } from '@/lib/admin';

const InvoiceFormSchema = CreateInvoiceSchema.extend({
  caseId: z.string().min(1, 'Хэрэг сонгоно уу'),
  dueDate: z.string().min(1, 'Төлөх хугацааг оруулна уу'),
});
type InvoiceFormInput = z.input<typeof InvoiceFormSchema>;
type InvoiceFormValues = z.output<typeof InvoiceFormSchema>;

/** Creates a DRAFT invoice. Pass `caseId` to lock it to one case, or `caseOptions` to let the user pick. */
export function InvoiceModal({ open, onOpenChange, caseId, caseOptions, onSaved }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId?: string;
  caseOptions?: SelectOption[];
  onSaved: (invoice: InvoiceItem) => void;
}) {
  const form = useForm<InvoiceFormInput, unknown, InvoiceFormValues>({
    resolver: zodResolver(InvoiceFormSchema),
    defaultValues: { caseId: caseId ?? '', amount: '', description: '', dueDate: '' },
  });

  useEffect(() => {
    if (open) form.reset({ caseId: caseId ?? '', amount: '', description: '', dueDate: '' });
  }, [open, caseId, form]);

  const save = useMutation({
    mutationFn: (values: InvoiceFormValues) => api.post<InvoiceItem>('/invoices', { ...values, dueDate: localDateToIso(values.dueDate) }),
    onSuccess: (invoice) => {
      toast.success('Нэхэмжлэх үүслээ', `${invoice.invoiceNumber} ноорог төлөвтэй хадгалагдлаа. Илгээхэд харилцагчид мэдэгдэл очно.`);
      onSaved(invoice);
      onOpenChange(false);
    },
    onError: (error) => toast.danger('Нэхэмжлэх үүсгэж чадсангүй', error instanceof ApiError ? error.message : undefined),
  });

  const { register, control, handleSubmit, formState: { errors } } = form;

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent
        title="Шинэ нэхэмжлэх"
        description="Нэхэмжлэх ноорог төлөвтэй үүснэ. Шалгасны дараа «Илгээх» товчоор харилцагчид илгээнэ."
        footer={
          <>
            <Button variant="ghost" size="md" onClick={() => onOpenChange(false)} disabled={save.isPending}>Болих</Button>
            <Button size="md" type="submit" form="invoice-form" disabled={save.isPending}>{save.isPending ? 'Хадгалж байна…' : 'Үүсгэх'}</Button>
          </>
        }
      >
        <form id="invoice-form" onSubmit={handleSubmit((values) => save.mutate(values))} noValidate className="flex flex-col gap-5">
          {!caseId && (
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
