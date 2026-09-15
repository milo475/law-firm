'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { RejectPaymentSchema } from '@law-firm/shared/schemas';
import { useMutation } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Modal, ModalContent } from '@/components/ui/modal';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';
import { ApiError, api, type InvoiceItem } from '@/lib/api';
import { formatMoney } from '@/lib/format';

type RejectPaymentValues = z.infer<typeof RejectPaymentSchema>;

/** Asks for the mandatory reason; the invoice goes back to SENT and the client sees the reason. */
export function RejectPaymentModal({ invoice, open, onOpenChange, onRejected }: {
  invoice: InvoiceItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRejected: () => void | Promise<void>;
}) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<RejectPaymentValues>({
    resolver: zodResolver(RejectPaymentSchema),
    defaultValues: { reason: '' },
  });

  useEffect(() => {
    if (open) reset({ reason: '' });
  }, [open, reset]);

  const reject = useMutation({
    mutationFn: (values: RejectPaymentValues) => api.post<InvoiceItem>(`/invoices/${invoice.id}/reject-payment`, values),
    onSuccess: async (updated) => {
      toast.success('Төлбөр татгалзлаа', `${updated.invoiceNumber} «Илгээсэн» төлөвт буцаж, шалтгааныг харилцагчид мэдэгдлээ.`);
      onOpenChange(false);
      await onRejected();
    },
    onError: (error) => toast.danger('Татгалзаж чадсангүй', error instanceof ApiError ? error.message : undefined),
  });

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent
        title="Төлбөр татгалзах"
        footer={
          <>
            <Button variant="ghost" size="md" onClick={() => onOpenChange(false)} disabled={reject.isPending}>Болих</Button>
            <Button variant="danger" size="md" type="submit" form="reject-payment-form" disabled={reject.isPending}>
              {reject.isPending ? 'Түр хүлээнэ үү…' : 'Татгалзах'}
            </Button>
          </>
        }
      >
        <form id="reject-payment-form" noValidate className="flex flex-col gap-4" onSubmit={handleSubmit((values) => reject.mutate(values))}>
          <p className="text-body-sm text-text-secondary">
            {invoice.invoiceNumber} · {formatMoney(invoice.amount)}. Нэхэмжлэх «Илгээсэн» төлөвт буцаж, харилцагч шалгаад дахин тэмдэглэнэ.
          </p>
          <Textarea
            label="Татгалзах шалтгаан"
            required
            rows={4}
            placeholder="Жишээ: Дүн зөрсөн (400 000₮ орсон), эсвэл гүйлгээ олдсонгүй"
            error={errors.reason?.message}
            {...register('reason')}
          />
        </form>
      </ModalContent>
    </Modal>
  );
}
