// Figma: 02 Client Portal / Portal / 07 Invoices / Desktop (32:548) — "Invoice detail" panel (32:642).
// Shared by the invoices list (selected invoice, desktop) and the invoice detail route, together with the
// "Төлбөр төлөх" placeholder modal (there is no payment API yet).
'use client';

import Link from 'next/link';
import { INVOICE_STATUS_BADGE, StatusBadge, type BadgeTone } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Modal, ModalClose, ModalContent } from '@/components/ui/modal';
import type { InvoiceItem } from '@/lib/api';
import { formatDate, formatMoney } from '@/lib/format';
import { cn } from '@/lib/utils';

/** Client-facing badge labels from the Figma invoice cards — an issued, unpaid invoice reads "Төлөгдөөгүй". */
export const PORTAL_INVOICE_BADGE: Record<string, { tone: BadgeTone; label: string }> = {
  ...INVOICE_STATUS_BADGE,
  SENT: { tone: 'pending', label: 'Төлөгдөөгүй' },
};

export const isPayable = (invoice: Pick<InvoiceItem, 'status'>) => invoice.status === 'SENT' || invoice.status === 'OVERDUE';

/** Firm bank account as printed in the Figma panel — static copy, not served by the API. */
export const BANK_ACCOUNT = 'Хаан банк · 5023 1188 22';

/** Demo-only route state for "Portal / 07b Payment Success" (38:1308). */
export const PAYMENT_PREVIEW_VALUE = 'payment-success';
export const paymentPreviewHref = (id: string) => `/portal/invoices/${id}?preview=${PAYMENT_PREVIEW_VALUE}`;

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
      </dl>
      <div aria-hidden className="h-px w-full bg-border-default" />
      <div className="flex items-center justify-between gap-4">
        <span className="text-body-medium text-text-primary">Нийт дүн</span>
        <span className="text-h4 text-text-brand">{formatMoney(invoice.amount)}</span>
      </div>
      {payable && (
        <>
          <Button size="lg" className="w-full" onClick={onPay}>Төлбөр төлөх</Button>
          <p className="text-caption text-text-muted">Данс: {BANK_ACCOUNT} · Гүйлгээний утга: {invoice.invoiceNumber}</p>
        </>
      )}
    </Card>
  );
}

/** "Төлбөр төлөх" → online payment is not available yet; explains bank transfer and links to the demo success screen. */
export function PayComingSoonModal({
  invoice,
  open,
  onOpenChange,
}: {
  invoice: Pick<InvoiceItem, 'id' | 'invoiceNumber' | 'amount'> | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      {invoice && (
        <ModalContent
          title="Төлбөрийн систем удахгүй"
          description="Онлайн төлбөрийн систем удахгүй нэвтэрнэ. Одоогоор доорх дансанд шилжүүлэг хийж, гүйлгээний утгад нэхэмжлэхийн дугаараа бичнэ үү."
          footer={
            <>
              <Button asChild variant="ghost" size="md">
                <Link href={paymentPreviewHref(invoice.id)} onClick={() => onOpenChange(false)} aria-label="Амжилттай төлбөрийн дэлгэцийн жишээ харах">
                  Жишээ харах
                </Link>
              </Button>
              <ModalClose asChild>
                <Button size="md">Ойлголоо</Button>
              </ModalClose>
            </>
          }
        >
          <dl className="flex flex-col gap-2.5 rounded-md bg-bg-page px-6 py-5">
            <InvoiceDetailRow label="Нэхэмжлэхийн дугаар" value={invoice.invoiceNumber} />
            <InvoiceDetailRow label="Төлөх дүн" value={formatMoney(invoice.amount)} />
            <InvoiceDetailRow label="Данс" value={BANK_ACCOUNT} />
            <InvoiceDetailRow label="Гүйлгээний утга" value={invoice.invoiceNumber} />
          </dl>
        </ModalContent>
      )}
    </Modal>
  );
}
