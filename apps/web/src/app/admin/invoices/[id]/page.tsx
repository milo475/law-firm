'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { InvoiceActions } from '@/components/admin/invoice-actions';
import { RejectPaymentModal } from '@/components/admin/reject-payment-modal';
import { INVOICE_STATUS_BADGE, StatusBadge } from '@/components/ui/badge';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CardSkeleton, ErrorState, Skeleton } from '@/components/ui/states';
import { toast } from '@/components/ui/toast';
import { ApiError, api, type InvoiceItem } from '@/lib/api';
import { formatDate, formatMoney } from '@/lib/format';
import { INVOICE_PAYMENT_SUMMARY_KEY } from '@/lib/invoices';
import { shortName } from '@/lib/utils';

/** Invoice detail for staff: facts, the client's payment report and the confirm / reject decision. */
export default function AdminInvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [rejectOpen, setRejectOpen] = useState(false);
  const invoice = useQuery({ queryKey: ['admin', 'invoice', id], queryFn: () => api.get<InvoiceItem>(`/invoices/${id}`), retry: false });

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['admin', 'invoice', id] }),
      queryClient.invalidateQueries({ queryKey: ['admin', 'invoices'] }),
      queryClient.invalidateQueries({ queryKey: ['admin', 'case'] }),
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] }),
      queryClient.invalidateQueries({ queryKey: INVOICE_PAYMENT_SUMMARY_KEY }),
    ]);
  };

  const confirm = useMutation({
    mutationFn: () => api.post<InvoiceItem>(`/invoices/${id}/confirm-payment`, {}),
    onSuccess: async (updated) => {
      toast.success('Төлбөр баталгаажлаа', `${updated.invoiceNumber} «Төлөгдсөн» боллоо. Харилцагчид мэдэгдэл очлоо.`);
      await refresh();
    },
    onError: (error) => toast.danger('Баталгаажуулж чадсангүй', error instanceof ApiError ? error.message : undefined),
  });

  if (invoice.isError) {
    const err = invoice.error;
    const forbidden = err instanceof ApiError && err.status === 403;
    return (
      <div className="flex flex-col gap-4">
        <Breadcrumb items={[{ label: 'Нэхэмжлэх', href: '/admin/invoices' }, { label: forbidden ? 'Хандах эрхгүй' : 'Олдсонгүй' }]} />
        <ErrorState
          title={forbidden ? '403 — Энэ нэхэмжлэхийг удирдах эрх танд байхгүй' : '404 — Нэхэмжлэх олдсонгүй'}
          message={err instanceof ApiError ? err.message : 'Алдаа гарлаа'}
        />
        <div><Button asChild variant="secondary" size="sm"><Link href="/admin/invoices">Нэхэмжлэх рүү буцах</Link></Button></div>
      </div>
    );
  }
  if (!invoice.data) {
    return <div className="flex flex-col gap-6"><Skeleton className="h-4 w-48" /><Skeleton className="h-10 w-1/3" /><CardSkeleton /></div>;
  }

  const inv = invoice.data;
  const awaiting = inv.status === 'AWAITING_CONFIRMATION';
  const confirmer = inv.confirmedBy ? shortName(inv.confirmedBy.firstName, inv.confirmedBy.lastName) : null;

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb items={[{ label: 'Нэхэмжлэх', href: '/admin/invoices' }, { label: inv.invoiceNumber }]} />

      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-h3 md:text-h2">{inv.invoiceNumber}</h2>
            <StatusBadge map={INVOICE_STATUS_BADGE} status={inv.status} />
          </div>
          <p className="text-body-sm text-text-secondary">
            <Link href={`/admin/cases/${inv.case.id}`} className="focus-ring rounded-sm text-text-accent hover:underline">{inv.case.caseNumber}</Link>
            {' · '}
            {inv.case.title}
          </p>
        </div>
        {/* Final statuses and payment reviews have no PATCH actions; the payment card covers them */}
        {!awaiting && inv.status !== 'PAID' && inv.status !== 'CANCELLED' && <InvoiceActions invoice={inv} onChanged={refresh} />}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="flex flex-col gap-4 p-6">
          <h3 className="text-h4">Нэхэмжлэх</h3>
          <dl className="flex flex-col gap-3">
            <Row label="Дүн" value={<span className="text-h4 text-text-brand">{formatMoney(inv.amount)}</span>} />
            <Row label="Үйлчилгээ" value={inv.description} />
            <Row label="Үүссэн" value={formatDate(inv.createdAt)} />
            <Row label="Төлөх хугацаа" value={formatDate(inv.dueDate)} />
            {inv.paidAt && <Row label="Төлсөн" value={formatDate(inv.paidAt, true)} />}
            {confirmer && <Row label="Баталгаажуулсан" value={confirmer} />}
          </dl>
        </Card>

        <Card className="flex flex-col gap-4 p-6">
          <h3 className="text-h4">Төлбөр</h3>
          {awaiting ? (
            <>
              <div role="status" className="flex flex-col gap-1 rounded-md border-l-[3px] border-status-pending-fg bg-status-pending-bg px-4 py-3">
                <p className="text-body-sm-medium text-status-pending-fg">Харилцагч төлбөр хийсэн гэж тэмдэглэсэн</p>
                <p className="text-body-sm text-text-secondary">{inv.paymentMarkedAt ? formatDate(inv.paymentMarkedAt, true) : '—'}</p>
              </div>
              <dl className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <dt className="text-body-sm text-text-muted">Харилцагчийн тэмдэглэл</dt>
                  <dd className="whitespace-pre-wrap break-words text-body-sm-medium text-text-primary">
                    {inv.paymentNote ?? <span className="text-text-muted">Тэмдэглэл үлдээгээгүй</span>}
                  </dd>
                </div>
                <Row label="Шалгах дүн" value={formatMoney(inv.amount)} />
                <Row label="Гүйлгээний утга" value={inv.invoiceNumber} />
              </dl>
              <p className="text-caption text-text-muted">Дансны хуулгаас гүйлгээ, дүнг тулгаад шийдвэрлэнэ үү. Хоёр тохиолдолд харилцагчид мэдэгдэл очно.</p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  size="md"
                  className="bg-status-progress-fg text-text-on-inverse hover:bg-status-progress-fg/90"
                  disabled={confirm.isPending}
                  onClick={() => confirm.mutate()}
                >
                  {confirm.isPending ? 'Түр хүлээнэ үү…' : 'Төлбөр баталгаажуулах'}
                </Button>
                <Button variant="secondary" size="md" disabled={confirm.isPending} onClick={() => setRejectOpen(true)}>Татгалзах</Button>
              </div>
            </>
          ) : inv.status === 'PAID' ? (
            <div className="flex flex-col gap-1 rounded-md border-l-[3px] border-status-progress-fg bg-status-progress-bg px-4 py-3">
              <p className="text-body-sm-medium text-status-progress-fg">Төлбөр баталгаажсан</p>
              <p className="text-body-sm text-text-secondary">
                {inv.paidAt ? formatDate(inv.paidAt, true) : ''}
                {confirmer ? ` · ${confirmer}` : ''}
              </p>
              {inv.paymentNote && <p className="text-caption text-text-muted">Харилцагчийн тэмдэглэл: {inv.paymentNote}</p>}
            </div>
          ) : inv.paymentRejectionReason ? (
            <div className="flex flex-col gap-1 rounded-md border-l-[3px] border-status-danger-fg bg-status-danger-bg px-4 py-3">
              <p className="text-body-sm-medium text-status-danger-fg">Сүүлд татгалзсан</p>
              <p className="text-body-sm text-text-secondary">{inv.paymentRejectionReason}</p>
              <p className="text-caption text-text-muted">{formatDate(inv.paymentRejectedAt, true)} · харилцагч дахин тэмдэглэхийг хүлээж байна</p>
            </div>
          ) : (
            <p className="text-body-sm text-text-secondary">
              {inv.status === 'DRAFT'
                ? 'Ноорог нэхэмжлэх харилцагчид илгээгдээгүй байна.'
                : inv.status === 'CANCELLED'
                  ? 'Цуцалсан нэхэмжлэх.'
                  : 'Харилцагч төлбөр хийсэн гэж тэмдэглээгүй байна.'}
            </p>
          )}
        </Card>
      </div>

      {awaiting && <RejectPaymentModal invoice={inv} open={rejectOpen} onOpenChange={setRejectOpen} onRejected={refresh} />}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="shrink-0 text-body-sm text-text-muted">{label}</dt>
      <dd className="min-w-0 text-right text-body-sm-medium text-text-primary">{value}</dd>
    </div>
  );
}
