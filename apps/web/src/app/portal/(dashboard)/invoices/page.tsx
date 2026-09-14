'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { INVOICE_STATUS_BADGE, StatusBadge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { EmptyState, ErrorState, TableSkeleton } from '@/components/ui/states';
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '@/components/ui/table';
import { ApiError, api, type InvoiceItem, type Paginated } from '@/lib/api';
import { INVOICE_STATUS_LABELS, formatDate, formatMoney } from '@/lib/format';

const STATUS_OPTIONS = [{ value: 'ALL', label: 'Бүх төлөв' }, ...Object.entries(INVOICE_STATUS_LABELS).map(([value, label]) => ({ value, label }))];

export default function InvoicesPage() {
  const router = useRouter();
  const [status, setStatus] = useState('ALL');
  const query = useQuery({
    queryKey: ['invoices', status],
    queryFn: () => api.get<Paginated<InvoiceItem>>(`/invoices?limit=50${status !== 'ALL' ? `&status=${status}` : ''}`),
  });
  const items = query.data?.items ?? [];
  const open = items.filter((i) => i.status === 'SENT' || i.status === 'OVERDUE').reduce((s, i) => s + Number(i.amount), 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-h3">Нэхэмжлэх</h2>
          <p className="mt-1 text-body-sm text-text-secondary">Төлбөрийн нэхэмжлэхүүд ба тэдгээрийн төлөв.</p>
        </div>
        <Select wrapperClassName="md:w-[220px]" label="Төлөв" options={STATUS_OPTIONS} value={status} onValueChange={setStatus} />
      </div>

      {!query.isLoading && !query.isError && (
        <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
          <p className="text-body-sm text-text-secondary">Төлөгдөөгүй нийт дүн</p>
          <p className="font-serif text-h3 text-text-brand">{formatMoney(open)}</p>
        </Card>
      )}

      {query.isError ? (
        <ErrorState message={query.error instanceof ApiError ? query.error.message : 'Алдаа гарлаа'} onRetry={() => void query.refetch()} />
      ) : query.isLoading ? (
        <TableSkeleton />
      ) : items.length === 0 ? (
        <EmptyState title="Нэхэмжлэх байхгүй байна" />
      ) : (
        <>
          <div className="hidden md:block">
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Дугаар</TableHeaderCell>
                  <TableHeaderCell>Хэрэг</TableHeaderCell>
                  <TableHeaderCell>Тайлбар</TableHeaderCell>
                  <TableHeaderCell className="text-right">Дүн</TableHeaderCell>
                  <TableHeaderCell>Төлөх хугацаа</TableHeaderCell>
                  <TableHeaderCell>Статус</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((inv) => (
                  <TableRow key={inv.id} interactive className="cursor-pointer" onClick={() => router.push(`/portal/invoices/${inv.id}`)}>
                    <TableCell className="text-body-sm-medium text-text-primary"><Link href={`/portal/invoices/${inv.id}`} className="focus-ring rounded-sm" onClick={(e) => e.stopPropagation()}>{inv.invoiceNumber}</Link></TableCell>
                    <TableCell>{inv.case.caseNumber}</TableCell>
                    <TableCell className="max-w-[320px] truncate">{inv.description}</TableCell>
                    <TableCell className="text-right text-body-sm-medium text-text-primary">{formatMoney(inv.amount)}</TableCell>
                    <TableCell>{formatDate(inv.dueDate)}</TableCell>
                    <TableCell><StatusBadge map={INVOICE_STATUS_BADGE} status={inv.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <ul className="grid gap-3 md:hidden">
            {items.map((inv) => (
              <li key={inv.id}>
                <Link href={`/portal/invoices/${inv.id}`} className="focus-ring flex flex-col gap-2 rounded-lg border border-border-default bg-bg-surface p-5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-caption text-text-muted">{inv.invoiceNumber}</span>
                    <StatusBadge map={INVOICE_STATUS_BADGE} status={inv.status} />
                  </div>
                  <p className="font-serif text-h4 text-text-brand">{formatMoney(inv.amount)}</p>
                  <p className="text-body-sm text-text-secondary">{inv.description}</p>
                  <p className="text-caption text-text-muted">{inv.case.caseNumber} · төлөх хугацаа {formatDate(inv.dueDate)}</p>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
