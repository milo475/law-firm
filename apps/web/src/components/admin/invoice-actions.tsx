'use client';

import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { INVOICE_STATUS_TRANSITIONS } from '@law-firm/shared/schemas';
import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { INVOICE_STATUS_BADGE } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { ApiError, api, type InvoiceItem } from '@/lib/api';
import type { InvoiceStatus } from '@/lib/admin';
import { formatDate } from '@/lib/format';

const ACTION_LABELS: Record<InvoiceStatus, string> = {
  DRAFT: 'Ноорог',
  SENT: 'Илгээх',
  AWAITING_CONFIRMATION: 'Баталгаажуулж буй',
  PAID: 'Төлөгдсөн',
  OVERDUE: 'Хугацаа хэтэрсэн гэж тэмдэглэх',
  CANCELLED: 'Цуцлах',
};

/** The usual next step is a button; the remaining allowed transitions live in a compact menu. */
const PRIMARY_NEXT: Partial<Record<InvoiceStatus, InvoiceStatus>> = { DRAFT: 'SENT', SENT: 'PAID', OVERDUE: 'PAID' };

/** Status actions allowed by INVOICE_STATUS_TRANSITIONS; final statuses show a note instead. */
export function InvoiceActions({ invoice, onChanged }: { invoice: InvoiceItem; onChanged: () => void | Promise<void> }) {
  const transition = useMutation({
    mutationFn: (status: InvoiceStatus) => api.patch<InvoiceItem>(`/invoices/${invoice.id}`, { status }),
    onSuccess: async (updated) => {
      toast.success(
        'Нэхэмжлэх шинэчлэгдлээ',
        updated.status === 'SENT'
          ? `${updated.invoiceNumber} харилцагчид илгээгдэж, мэдэгдэл очлоо.`
          : `${updated.invoiceNumber} · ${INVOICE_STATUS_BADGE[updated.status]?.label ?? updated.status}`,
      );
      await onChanged();
    },
    onError: (error) => toast.danger('Төлөв солиход алдаа гарлаа', error instanceof ApiError ? error.message : undefined),
  });

  const status = invoice.status as InvoiceStatus;
  if (status === 'AWAITING_CONFIRMATION') {
    return (
      <Button asChild size="sm">
        <Link href={`/admin/invoices/${invoice.id}`}>Төлбөр шалгах</Link>
      </Button>
    );
  }
  // Payment reports go through the dedicated confirm/reject actions, never through PATCH.
  const next: readonly InvoiceStatus[] = (INVOICE_STATUS_TRANSITIONS[status] ?? []).filter((s) => s !== 'AWAITING_CONFIRMATION');
  if (next.length === 0) {
    return <span className="whitespace-nowrap text-caption text-text-muted">{invoice.paidAt ? `Төлсөн ${formatDate(invoice.paidAt)}` : 'Эцсийн төлөв'}</span>;
  }
  const primary = PRIMARY_NEXT[status] && next.includes(PRIMARY_NEXT[status]!) ? PRIMARY_NEXT[status]! : null;
  const rest = next.filter((s) => s !== primary);

  return (
    <div className="flex flex-nowrap items-center justify-end gap-1">
      {primary && (
        <Button variant="secondary" size="sm" disabled={transition.isPending} onClick={() => transition.mutate(primary)}>
          {ACTION_LABELS[primary]}
        </Button>
      )}
      {rest.length > 0 && (
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <Button variant="ghost" size="icon" disabled={transition.isPending} aria-label={`${invoice.invoiceNumber} — бусад үйлдэл`}>
              <span aria-hidden className="text-body-lg leading-none">⋯</span>
            </Button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content align="end" sideOffset={6} className="z-50 min-w-[220px] overflow-hidden rounded-md border border-border-default bg-bg-surface py-2 shadow-menu">
              {rest.map((s) => (
                <DropdownMenu.Item
                  key={s}
                  onSelect={() => transition.mutate(s)}
                  className={`flex h-11 cursor-pointer select-none items-center px-4 text-body-sm outline-none data-[highlighted]:bg-bg-brand-soft ${s === 'CANCELLED' ? 'text-status-danger-fg' : 'text-text-primary'}`}
                >
                  {ACTION_LABELS[s]}
                </DropdownMenu.Item>
              ))}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      )}
    </div>
  );
}
