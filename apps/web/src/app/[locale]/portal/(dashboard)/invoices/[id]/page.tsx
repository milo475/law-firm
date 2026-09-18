// Figma: 02 Client Portal / Portal / 07 Invoices / Desktop (32:548) — "Invoice detail" panel (32:642), Mobile (36:1263).
// "Төлбөр төлөх" opens the bank transfer instructions; the client reports the transfer and staff confirm it.
'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { CardSkeleton, ErrorState, Skeleton } from '@/components/ui/states';
import { ApiError, api, type InvoiceItem } from '@/lib/api';
import { InvoiceDetailPanel, PaymentModal } from '../invoice-panel';

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
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
  if (!query.data) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="hidden h-4 w-48 md:block" />
        <CardSkeleton className="w-full max-w-[560px]" />
      </div>
    );
  }
  const inv = query.data;

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <Breadcrumb className="hidden md:block" items={[{ label: 'Портал', href: '/portal' }, { label: 'Нэхэмжлэх', href: '/portal/invoices' }, { label: inv.invoiceNumber }]} />
      <InvoiceDetailPanel invoice={inv} className="w-full max-w-[560px]" onPay={() => setPayOpen(true)} />
      <PaymentModal invoice={inv} open={payOpen} onOpenChange={setPayOpen} />
    </div>
  );
}
