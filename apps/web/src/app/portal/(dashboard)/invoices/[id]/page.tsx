// Figma: 02 Client Portal / Portal / 07 Invoices / Desktop (32:548) — "Invoice detail" panel (32:642), Mobile (36:1263);
//        Portal / 07b Payment Success / Desktop (38:1308) — shown ONLY as a labelled demo (?preview=payment-success).
//        There is no payment API: "Төлбөр төлөх" opens the "Төлбөрийн систем удахгүй" modal.
'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { SuccessCheckIcon } from '@/components/icons';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CardSkeleton, ErrorState, Skeleton } from '@/components/ui/states';
import { ApiError, api, type InvoiceItem } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import { InvoiceDetailPanel, InvoiceDetailRow, PAYMENT_PREVIEW_VALUE, PayComingSoonModal } from '../invoice-panel';

function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="hidden h-4 w-48 md:block" />
      <CardSkeleton className="w-full max-w-[560px]" />
    </div>
  );
}

export default function InvoiceDetailPage() {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <InvoiceDetailContent />
    </Suspense>
  );
}

function InvoiceDetailContent() {
  const { id } = useParams<{ id: string }>();
  const preview = useSearchParams().get('preview') === PAYMENT_PREVIEW_VALUE;
  const [payOpen, setPayOpen] = useState(false);
  const query = useQuery({ queryKey: ['invoice', id], queryFn: () => api.get<InvoiceItem>(`/invoices/${id}`), retry: false });

  if (query.isError) {
    const err = query.error;
    return (
      <div className="flex flex-col gap-4">
        <ErrorState title={err instanceof ApiError && err.status === 403 ? '403 — Хандах эрхгүй' : 'Нэхэмжлэх олдсонгүй'} message={err instanceof ApiError ? err.message : 'Алдаа гарлаа'} />
        <div><Button asChild variant="secondary" size="sm"><Link href="/portal/invoices">Нэхэмжлэх рүү буцах</Link></Button></div>
      </div>
    );
  }
  if (!query.data) return <DetailSkeleton />;
  const inv = query.data;

  if (preview) return <PaymentSuccessPreview invoice={inv} />;

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <Breadcrumb className="hidden md:block" items={[{ label: 'Портал', href: '/portal' }, { label: 'Нэхэмжлэх', href: '/portal/invoices' }, { label: inv.invoiceNumber }]} />
      <InvoiceDetailPanel invoice={inv} className="w-full max-w-[560px]" onPay={() => setPayOpen(true)} />
      <PayComingSoonModal invoice={inv} open={payOpen} onOpenChange={setPayOpen} />
    </div>
  );
}

/**
 * Figma "Success card" (38:1324) rendered as a clearly-labelled DEMO. No payment is processed, so the copy
 * describes what will appear once online payment exists, and transaction number / date stay empty.
 */
function PaymentSuccessPreview({ invoice }: { invoice: InvoiceItem }) {
  return (
    <div className="flex flex-col items-center gap-4 md:justify-center md:py-10">
      <div role="note" className="flex w-full max-w-[560px] flex-col gap-1 rounded-lg border-l-[3px] border-status-pending-fg bg-status-pending-bg px-5 py-4">
        <p className="text-body-sm-medium text-status-pending-fg">Жишээ харагдац — бодит төлбөр хийгдээгүй</p>
        <p className="text-body-sm text-text-secondary">
          Онлайн төлбөрийн систем нэвтэрсний дараа амжилттай төлбөрийн дараа энэ дэлгэц харагдана. {invoice.invoiceNumber} нэхэмжлэхийн төлөв өөрчлөгдөөгүй.
        </p>
      </div>

      <Card className="flex w-full max-w-[560px] flex-col items-center gap-6 px-6 pb-8 pt-10 shadow-menu md:px-12 md:pb-12 md:pt-14">
        <SuccessCheckIcon />
        <div className="flex flex-col items-center gap-2 text-center">
          <p className="text-overline text-text-accent">Жишээ</p>
          <h2 className="text-h3 text-text-primary md:text-h2">Төлбөр амжилттай хийгдлээ</h2>
        </div>
        <p className="text-center text-body text-text-secondary">
          Төлбөр амжилттай болсон үед {invoice.invoiceNumber} нэхэмжлэхийн {formatMoney(invoice.amount)} төлбөрийн баталгаа энд харагдаж, баримтыг таны имэйл хаяг руу илгээнэ.
        </p>
        <dl className="flex w-full flex-col gap-2.5 rounded-md bg-bg-page px-6 py-5">
          <InvoiceDetailRow label="Нэхэмжлэхийн дугаар" value={invoice.invoiceNumber} />
          <InvoiceDetailRow label="Гүйлгээний дугаар" value="—" />
          <InvoiceDetailRow label="Огноо" value="—" />
          <InvoiceDetailRow label="Төлөх дүн" value={formatMoney(invoice.amount)} />
        </dl>
        <div className="grid w-full gap-3 sm:grid-cols-2">
          <Button variant="secondary" size="md" disabled title="Жишээ горимд баримт үүсэхгүй">Баримт татах</Button>
          <Button asChild size="md"><Link href="/portal">Нүүр хуудас руу</Link></Button>
        </div>
        <Button asChild variant="ghost" size="sm"><Link href={`/portal/invoices/${invoice.id}`}>Жишээг хаах</Link></Button>
      </Card>
    </div>
  );
}
