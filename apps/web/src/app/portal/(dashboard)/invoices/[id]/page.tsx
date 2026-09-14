'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { INVOICE_STATUS_BADGE, StatusBadge } from '@/components/ui/badge';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Modal, ModalContent } from '@/components/ui/modal';
import { CardSkeleton, ErrorState, Skeleton } from '@/components/ui/states';
import { ApiError, api, type InvoiceItem } from '@/lib/api';
import { formatDate, formatMoney } from '@/lib/format';

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
  if (!query.data) return <div className="flex flex-col gap-6"><Skeleton className="h-4 w-48" /><CardSkeleton /></div>;
  const inv = query.data;
  const payable = inv.status === 'SENT' || inv.status === 'OVERDUE';

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb items={[{ label: 'Портал', href: '/portal' }, { label: 'Нэхэмжлэх', href: '/portal/invoices' }, { label: inv.invoiceNumber }]} />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card className="flex flex-col gap-6 p-6 md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex flex-col gap-2">
              <p className="text-overline text-text-accent">Нэхэмжлэх</p>
              <h2 className="text-h3">{inv.invoiceNumber}</h2>
            </div>
            <StatusBadge map={INVOICE_STATUS_BADGE} status={inv.status} />
          </div>
          <dl className="grid gap-5 border-t border-border-subtle pt-6 sm:grid-cols-2">
            <Row label="Хэрэг" value={<Link href={`/portal/cases/${inv.case.id}`} className="focus-ring rounded-sm text-text-accent hover:underline">{inv.case.caseNumber} · {inv.case.title}</Link>} />
            <Row label="Тайлбар" value={inv.description} />
            <Row label="Үүсгэсэн" value={formatDate(inv.createdAt)} />
            <Row label="Төлөх хугацаа" value={formatDate(inv.dueDate)} />
            {inv.paidAt && <Row label="Төлөгдсөн" value={formatDate(inv.paidAt, true)} />}
          </dl>
          <div className="flex items-end justify-between gap-4 rounded-md bg-bg-brand-soft px-5 py-4">
            <span className="text-body-sm text-text-secondary">Нийт дүн</span>
            <span className="font-serif text-h2 text-text-brand">{formatMoney(inv.amount)}</span>
          </div>
        </Card>
        <div className="flex flex-col gap-4">
          <Card className="flex flex-col gap-4 p-6">
            <h3 className="text-h4">Төлбөр</h3>
            <p className="text-body-sm text-text-secondary">{payable ? 'Нэхэмжлэхийг онлайнаар төлөх боломж удахгүй нэвтэрнэ. Одоогоор банкны шилжүүлгээр төлнө үү.' : 'Энэ нэхэмжлэх төлбөр шаардахгүй.'}</p>
            <Button size="md" disabled={!payable} onClick={() => setPayOpen(true)}>Төлөх</Button>
          </Card>
          <Card className="flex flex-col gap-2 p-6 text-body-sm text-text-secondary">
            <p className="text-body-medium text-text-primary">Банкны мэдээлэл</p>
            <p>Хаан банк · 5000 123 456</p>
            <p>Хүлээн авагч: Тулгуур Хуулийн Фирм ХХК</p>
            <p>Гүйлгээний утга: {inv.invoiceNumber}</p>
          </Card>
        </div>
      </div>

      <Modal open={payOpen} onOpenChange={setPayOpen}>
        <ModalContent
          title="Төлбөрийн систем удахгүй"
          description="Онлайн төлбөрийн систем (QPay, картын төлбөр) удахгүй нэвтэрнэ. Одоогоор дээрх банкны мэдээллээр шилжүүлэг хийж, гүйлгээний утгад нэхэмжлэхийн дугаараа бичнэ үү."
          footer={<Button size="md" onClick={() => setPayOpen(false)}>Ойлголоо</Button>}
        />
      </Modal>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-caption text-text-muted">{label}</dt>
      <dd className="text-body text-text-primary">{value}</dd>
    </div>
  );
}
