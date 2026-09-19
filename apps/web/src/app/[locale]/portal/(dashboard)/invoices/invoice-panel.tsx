// Figma: 02 Client Portal / Portal / 07 Invoices / Desktop (32:548) — "Invoice detail" panel (32:642).
// Shared by the invoices list (selected invoice, desktop) and the invoice detail route, together with the
// {t('title')} modal: the client transfers to the firm account, reports it, and staff confirm the payment.
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { MarkPaymentSchema } from '@law-firm/shared/schemas';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
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
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { cn, shortName } from '@/lib/utils';

export { isPayable } from '@/lib/invoices';

/** Client-facing badge labels from the Figma invoice cards — an issued, unpaid invoice reads "Төлөгдөөгүй". */
const PORTAL_INVOICE_BADGE: Record<string, { tone: BadgeTone; label: string }> = {
  ...INVOICE_STATUS_BADGE,
  SENT: { tone: 'pending', label: 'Төлөгдөөгүй' },
};

export function InvoiceStatusBadge({ status, className }: { status: string; className?: string }) {
  const t = useTranslations('portal.invoices.status');
  return <StatusBadge map={PORTAL_INVOICE_BADGE} status={status} label={t(status)} className={className} />;
}

/** Figma "Row" (32:648): muted label left, medium value right. */
function InvoiceDetailRow({ label, value }: { label: string; value: React.ReactNode }) {
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
  const t = useTranslations('portal.invoices.detail');
  const locale = useLocale() as Locale;
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
            label={t('issuer')}
            value={
              <span className="flex flex-col items-end gap-0.5">
                <span>{firm.data.name}</span>
                <span className="text-caption text-text-muted">{firmIssuerLine(firm.data)}</span>
              </span>
            }
          />
        )}
        <InvoiceDetailRow
          label={t('case')}
          value={
            <Link href={`/portal/cases/${invoice.case.id}`} title={invoice.case.title} className="focus-ring rounded-sm hover:text-text-brand hover:underline">
              {invoice.case.caseNumber}
            </Link>
          }
        />
        <InvoiceDetailRow label={t('service')} value={invoice.description} />
        <InvoiceDetailRow label={t('created')} value={formatDate(invoice.createdAt, locale)} />
        <InvoiceDetailRow label={t('due')} value={formatDate(invoice.dueDate, locale)} />
        {invoice.paidAt && <InvoiceDetailRow label={t('paid')} value={formatDate(invoice.paidAt, locale)} />}
        {invoice.status === 'PAID' && invoice.confirmedBy && (
          <InvoiceDetailRow label={t('confirmedBy')} value={shortName(invoice.confirmedBy.firstName, invoice.confirmedBy.lastName)} />
        )}
      </dl>
      <div aria-hidden className="h-px w-full bg-border-default" />
      <div className="flex items-center justify-between gap-4">
        <span className="text-body-medium text-text-primary">{t('total')}</span>
        <span className="text-h4 text-text-brand">{formatMoney(invoice.amount, locale)}</span>
      </div>

      {payable && invoice.paymentRejectionReason && (
        <div role="alert" className="flex flex-col gap-1 rounded-md bg-status-danger-bg px-4 py-3 text-status-danger-fg">
          <p className="text-body-sm-medium">{t('rejectedTitle')}</p>
          <p className="text-body-sm">{invoice.paymentRejectionReason}</p>
          <p className="text-caption">{t('rejectedHint')}</p>
        </div>
      )}
      {awaiting && (
        <div role="status" className="flex flex-col gap-1 rounded-md bg-status-pending-bg px-4 py-3 text-status-pending-fg">
          <p className="text-body-sm-medium">{t('reviewTitle')}</p>
          <p className="text-body-sm">
            {invoice.paymentMarkedAt ? `${t('markedAt', { date: formatDate(invoice.paymentMarkedAt, locale, true) })} ` : ''}{t('reviewBody')}
          </p>
          {invoice.paymentNote && <p className="text-caption">{t('yourNote', { note: invoice.paymentNote })}</p>}
        </div>
      )}

      {payable && (
        <>
          <Button size="lg" className="w-full" onClick={onPay}>{t('pay')}</Button>
          <p className="text-caption text-text-muted">
            {bank.data ? `${t('account', { bank: bank.data.bankName, number: formatAccountNumber(bank.data.accountNumber) })} · ` : ''}{t('reference', { number: invoice.invoiceNumber })}
          </p>
        </>
      )}
      {awaiting && <Button size="lg" className="w-full" disabled>{t('confirming')}</Button>}
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
  const t = useTranslations('portal.invoices.payment');
  const tCommon = useTranslations('common');
  const locale = useLocale() as Locale;
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
      toast.success(t('markedTitle'), t('markedBody', { number: updated.invoiceNumber }));
      onOpenChange(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['invoices'] }),
        queryClient.invalidateQueries({ queryKey: ['invoice', updated.id] }),
        queryClient.invalidateQueries({ queryKey: INVOICE_PAYMENT_SUMMARY_KEY }),
      ]);
    },
    onError: (error) => toast.danger(t('markFailed'), error instanceof ApiError ? error.message : t('tryAgain')),
  });

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t('copied'), label);
    } catch {
      toast.warning(t('copyFailed'), t('copyFailedBody'));
    }
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      {invoice && (
        <ModalContent
          closeLabel={tCommon('close')}
          title={t('title')}
          description={t('description')}
          footer={
            <>
              <Button variant="ghost" size="md" onClick={() => onOpenChange(false)} disabled={mark.isPending}>{t('cancel')}</Button>
              <Button size="md" type="submit" form="mark-paid-form" disabled={mark.isPending || !bank.data}>
                {mark.isPending ? t('submitting') : t('submit')}
              </Button>
            </>
          }
        >
          <div className="flex flex-col gap-4">
            {bank.isError ? (
              <ErrorState message={t('bankError')} onRetry={() => void bank.refetch()} />
            ) : !bank.data ? (
              <Skeleton className="h-44" />
            ) : (
              <dl aria-label={t('transferInfo')} className="flex flex-col gap-2.5 rounded-md bg-bg-page px-5 py-4 md:px-6 md:py-5">
                <TransferRow label={t('bank')} value={bank.data.bankName} />
                <TransferRow
                  label={t('accountNumber')}
                  value={<CopyValue value={formatAccountNumber(bank.data.accountNumber)} label={t('copyAccountNumber')} onCopy={() => void copy(bank.data.accountNumber, t('accountNumber'))} />}
                />
                <TransferRow label={t('recipient')} value={bank.data.accountName} />
                <TransferRow
                  label={t('amount')}
                  value={<CopyValue value={formatMoney(invoice.amount, locale)} label={t('copyAmount')} onCopy={() => void copy(String(Number(invoice.amount)), t('amount'))} />}
                />
                <TransferRow
                  label={t('reference')}
                  value={<CopyValue value={invoice.invoiceNumber} label={t('copyReference')} onCopy={() => void copy(invoice.invoiceNumber, t('reference'))} />}
                />
              </dl>
            )}
            <p className="rounded-md bg-bg-brand-soft px-4 py-3 text-body-sm text-text-brand">
              {t('referenceHint', { number: invoice.invoiceNumber })}
            </p>
            {invoice.paymentRejectionReason && (
              <p role="alert" className="rounded-md bg-status-danger-bg px-4 py-3 text-body-sm text-status-danger-fg">
                {t('previousRejected', { reason: invoice.paymentRejectionReason })}
              </p>
            )}
            <form id="mark-paid-form" noValidate onSubmit={handleSubmit((values) => mark.mutate({ id: invoice.id, paymentNote: values.paymentNote }))}>
              <Textarea
                label={t('noteLabel')}
                helper={t('noteHelper')}
                rows={3}
                placeholder={t('notePlaceholder', { date: formatDate(new Date(), locale), amount: formatMoney(invoice.amount, locale), number: invoice.invoiceNumber })}
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
  const t = useTranslations('portal.invoices.payment');
  return (
    <span className="inline-flex items-center gap-2">
      <span className="whitespace-nowrap">{value}</span>
      <Button type="button" variant="ghost" size="sm" onClick={onCopy} aria-label={label} className="-my-2 h-8 px-2 text-caption">
        {t('copy')}
      </Button>
    </span>
  );
}
