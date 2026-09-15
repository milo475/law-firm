// Figma: 02 Client Portal / Portal / 07 Invoices / Desktop (32:548) — "Invoice detail" panel (32:642).
// Shared by the invoices list (selected invoice, desktop) and the invoice detail route, together with the
// "Төлбөрийн заавар" modal: the client transfers to the firm account, reports it, and staff confirm the payment.
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { MarkPaymentSchema } from '@law-firm/shared/schemas';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { INVOICE_STATUS_BADGE, StatusBadge, type BadgeTone } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Modal, ModalContent } from '@/components/ui/modal';
import { ErrorState, Skeleton } from '@/components/ui/states';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';
import { ApiError, api, type InvoiceItem } from '@/lib/api';
import { formatDate, formatMoney } from '@/lib/format';
import { firmIssuerLine } from '@/lib/firm';
import { INVOICE_PAYMENT_SUMMARY_KEY, formatAccountNumber, isAwaitingConfirmation, isPayable, useBankAccount } from '@/lib/invoices';
import { useFirmSettings } from '@/lib/settings';
import { cn, shortName } from '@/lib/utils';

export { isPayable } from '@/lib/invoices';

/** Client-facing badge labels from the Figma invoice cards — an issued, unpaid invoice reads "Төлөгдөөгүй". */
export const PORTAL_INVOICE_BADGE: Record<string, { tone: BadgeTone; label: string }> = {
  ...INVOICE_STATUS_BADGE,
  SENT: { tone: 'pending', label: 'Төлөгдөөгүй' },
};

export function InvoiceStatusBadge({ status, className }: { status: string; className?: string }) {
  return <StatusBadge map={PORTAL_INVOICE_BADGE} status={status} className={className} />;
}

/** Figma "Row" (32:648): muted label left, medium value right. */
export function InvoiceDetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="shrink-0 text-body-sm text-text-muted">{label}</dt>
      <dd className="min-w-0 text-right text-body-sm-medium text-text-primary">{value}</dd>
    </div>
  );
}

export function InvoiceDetailPanel({
  invoice,
  onPay,
  as: Heading = 'h2',
  titleHref,
  className,
}: {
  invoice: InvoiceItem;
  onPay: () => void;
  as?: 'h2' | 'h3';
  /** When set, the invoice number links to the full detail route. */
  titleHref?: string;
  className?: string;
}) {
  const payable = isPayable(invoice);
  const awaiting = isAwaitingConfirmation(invoice);
  const bank = useBankAccount(payable);
  const firm = useFirmSettings();
  return (
    <Card className={cn('flex flex-col gap-3.5 p-6', className)}>
      <Heading className="text-h4 text-text-primary">
        {titleHref ? (
          <Link href={titleHref} className="focus-ring rounded-sm hover:text-text-brand">{invoice.invoiceNumber}</Link>
        ) : (
          invoice.invoiceNumber
        )}
      </Heading>
      <InvoiceStatusBadge status={invoice.status} className="self-start" />
      <div aria-hidden className="h-px w-full bg-border-default" />
      <dl className="flex flex-col gap-3.5">
        {firm.data && (
          <InvoiceDetailRow
            label="Нэхэмжлэгч"
            value={
              <span className="flex flex-col items-end gap-0.5">
                <span>{firm.data.name}</span>
                <span className="text-caption text-text-muted">{firmIssuerLine(firm.data)}</span>
              </span>
            }
          />
        )}
        <InvoiceDetailRow
          label="Хэрэг"
          value={
            <Link href={`/portal/cases/${invoice.case.id}`} title={invoice.case.title} className="focus-ring rounded-sm hover:text-text-brand hover:underline">
              {invoice.case.caseNumber}
            </Link>
          }
        />
        <InvoiceDetailRow label="Үйлчилгээ" value={invoice.description} />
        <InvoiceDetailRow label="Үүссэн" value={formatDate(invoice.createdAt)} />
        <InvoiceDetailRow label="Эцсийн хугацаа" value={formatDate(invoice.dueDate)} />
        {invoice.paidAt && <InvoiceDetailRow label="Төлсөн" value={formatDate(invoice.paidAt)} />}
        {invoice.status === 'PAID' && invoice.confirmedBy && (
          <InvoiceDetailRow label="Баталгаажуулсан" value={shortName(invoice.confirmedBy.firstName, invoice.confirmedBy.lastName)} />
        )}
      </dl>
      <div aria-hidden className="h-px w-full bg-border-default" />
      <div className="flex items-center justify-between gap-4">
        <span className="text-body-medium text-text-primary">Нийт дүн</span>
        <span className="text-h4 text-text-brand">{formatMoney(invoice.amount)}</span>
      </div>

      {payable && invoice.paymentRejectionReason && (
        <div role="alert" className="flex flex-col gap-1 rounded-md bg-status-danger-bg px-4 py-3 text-status-danger-fg">
          <p className="text-body-sm-medium">Төлбөр баталгаажсангүй</p>
          <p className="text-body-sm">{invoice.paymentRejectionReason}</p>
          <p className="text-caption">Шилжүүлгээ шалгаад «Төлбөр төлөх» дээр дарж дахин тэмдэглэнэ үү.</p>
        </div>
      )}
      {awaiting && (
        <div role="status" className="flex flex-col gap-1 rounded-md bg-status-pending-bg px-4 py-3 text-status-pending-fg">
          <p className="text-body-sm-medium">Таны төлбөрийг хянаж байна</p>
          <p className="text-body-sm">
            {invoice.paymentMarkedAt ? `${formatDate(invoice.paymentMarkedAt, true)}-нд тэмдэглэсэн. ` : ''}Баталгаажмагц мэдэгдэл очно.
          </p>
          {invoice.paymentNote && <p className="text-caption">Таны тэмдэглэл: {invoice.paymentNote}</p>}
        </div>
      )}

      {payable && (
        <>
          <Button size="lg" className="w-full" onClick={onPay}>Төлбөр төлөх</Button>
          <p className="text-caption text-text-muted">
            {bank.data ? `Данс: ${bank.data.bankName} · ${formatAccountNumber(bank.data.accountNumber)} · ` : ''}Гүйлгээний утга: {invoice.invoiceNumber}
          </p>
        </>
      )}
      {awaiting && <Button size="lg" className="w-full" disabled>Баталгаажуулж байна</Button>}
    </Card>
  );
}

const PaymentFormSchema = MarkPaymentSchema.extend({
  paymentNote: z.string().trim().max(500, 'Тэмдэглэл 500 тэмдэгтээс хэтрэхгүй байна'),
});
type PaymentFormValues = z.infer<typeof PaymentFormSchema>;

/** "Төлбөр төлөх" → bank transfer instructions with copy buttons, then "Төлбөр хийсэн" reports the transfer. */
export function PaymentModal({
  invoice,
  open,
  onOpenChange,
}: {
  invoice: InvoiceItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const bank = useBankAccount(open);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<PaymentFormValues>({
    resolver: zodResolver(PaymentFormSchema),
    defaultValues: { paymentNote: '' },
  });

  useEffect(() => {
    if (open) reset({ paymentNote: '' });
  }, [open, reset]);

  const mark = useMutation({
    mutationFn: ({ id, paymentNote }: { id: string; paymentNote: string }) =>
      api.post<InvoiceItem>(`/invoices/${id}/mark-paid`, paymentNote ? { paymentNote } : {}),
    onSuccess: async (updated) => {
      toast.success('Төлбөр тэмдэглэгдлээ', `${updated.invoiceNumber} — шалгаж баталгаажуулмагц мэдэгдэл очно.`);
      onOpenChange(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['invoices'] }),
        queryClient.invalidateQueries({ queryKey: ['invoice', updated.id] }),
        queryClient.invalidateQueries({ queryKey: INVOICE_PAYMENT_SUMMARY_KEY }),
      ]);
    },
    onError: (error) => toast.danger('Төлбөр тэмдэглэж чадсангүй', error instanceof ApiError ? error.message : 'Дахин оролдоно уу.'),
  });

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Хуулагдлаа', label);
    } catch {
      toast.warning('Хуулж чадсангүй', 'Утгыг гараар хуулна уу.');
    }
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      {invoice && (
        <ModalContent
          title="Төлбөрийн заавар"
          description="Доорх дансанд шилжүүлэг хийгээд «Төлбөр хийсэн» товчийг дарна уу. Бид гүйлгээг шалгаж баталгаажуулна."
          footer={
            <>
              <Button variant="ghost" size="md" onClick={() => onOpenChange(false)} disabled={mark.isPending}>Болих</Button>
              <Button size="md" type="submit" form="mark-paid-form" disabled={mark.isPending || !bank.data}>
                {mark.isPending ? 'Илгээж байна…' : 'Төлбөр хийсэн'}
              </Button>
            </>
          }
        >
          <div className="flex flex-col gap-4">
            {bank.isError ? (
              <ErrorState message="Дансны мэдээлэл ачаалж чадсангүй" onRetry={() => void bank.refetch()} />
            ) : !bank.data ? (
              <Skeleton className="h-44" />
            ) : (
              <dl aria-label="Шилжүүлгийн мэдээлэл" className="flex flex-col gap-2.5 rounded-md bg-bg-page px-5 py-4 md:px-6 md:py-5">
                <TransferRow label="Банк" value={bank.data.bankName} />
                <TransferRow
                  label="Дансны дугаар"
                  value={<CopyValue value={formatAccountNumber(bank.data.accountNumber)} label="Дансны дугаар хуулах" onCopy={() => void copy(bank.data.accountNumber, 'Дансны дугаар')} />}
                />
                <TransferRow label="Хүлээн авагч" value={bank.data.accountName} />
                <TransferRow
                  label="Төлөх дүн"
                  value={<CopyValue value={formatMoney(invoice.amount)} label="Төлөх дүн хуулах" onCopy={() => void copy(String(Number(invoice.amount)), 'Төлөх дүн')} />}
                />
                <TransferRow
                  label="Гүйлгээний утга"
                  value={<CopyValue value={invoice.invoiceNumber} label="Гүйлгээний утга хуулах" onCopy={() => void copy(invoice.invoiceNumber, 'Гүйлгээний утга')} />}
                />
              </dl>
            )}
            <p className="rounded-md bg-bg-brand-soft px-4 py-3 text-body-sm text-text-brand">
              Гүйлгээний утгад нэхэмжлэхийн дугаар {invoice.invoiceNumber}-г заавал бичнэ үү. Ингэснээр төлбөрийг хурдан тулгаж баталгаажуулна.
            </p>
            {invoice.paymentRejectionReason && (
              <p role="alert" className="rounded-md bg-status-danger-bg px-4 py-3 text-body-sm text-status-danger-fg">
                Өмнөх тэмдэглэл баталгаажсангүй: {invoice.paymentRejectionReason}
              </p>
            )}
            <form id="mark-paid-form" noValidate onSubmit={handleSubmit((values) => mark.mutate({ id: invoice.id, paymentNote: values.paymentNote }))}>
              <Textarea
                label="Гүйлгээний мэдээлэл"
                helper="Заавал биш: банк, огноо, дүн, гүйлгээний утга"
                rows={3}
                placeholder={`Жишээ: Хаан банк, ${formatDate(new Date())}, ${formatMoney(invoice.amount)}, утга ${invoice.invoiceNumber}`}
                error={errors.paymentNote?.message}
                {...register('paymentNote')}
              />
            </form>
          </div>
        </ModalContent>
      )}
    </Modal>
  );
}

/** Transfer rows stack on narrow screens so account numbers and references never break mid-value. */
function TransferRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <dt className="text-body-sm text-text-muted">{label}</dt>
      <dd className="min-w-0 text-body-sm-medium text-text-primary sm:text-right">{value}</dd>
    </div>
  );
}

function CopyValue({ value, label, onCopy }: { value: string; label: string; onCopy: () => void }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="whitespace-nowrap">{value}</span>
      <Button type="button" variant="ghost" size="sm" onClick={onCopy} aria-label={label} className="-my-2 h-8 px-2 text-caption">
        Хуулах
      </Button>
    </span>
  );
}
