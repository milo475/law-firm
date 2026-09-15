'use client';

import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { AdminPageTitle } from '@/components/admin/admin-page-title';
import { InvoiceActions } from '@/components/admin/invoice-actions';
import { InvoiceModal } from '@/components/admin/invoice-modal';
import { PlusIcon } from '@/components/icons';
import { useUser } from '@/components/portal/user-context';
import { INVOICE_STATUS_BADGE, StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/ui/pagination';
import { Select } from '@/components/ui/select';
import { EmptyState, ErrorState, TableSkeleton } from '@/components/ui/states';
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '@/components/ui/table';
import { ApiError, api, type CaseListItem, type InvoiceItem, type Paginated } from '@/lib/api';
import { INVOICE_STATUSES } from '@/lib/admin';
import { INVOICE_STATUS_LABELS, formatDate, formatMoney } from '@/lib/format';

export default function AdminInvoicesPage() {
  const { user } = useUser();
  const isAdmin = user.role === 'ADMIN';
  const queryClient = useQueryClient();
  const [status, setStatus] = useState('ALL');
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);

  const params = new URLSearchParams({ page: String(page), limit: '20' });
  if (status !== 'ALL') params.set('status', status);

  const invoices = useQuery({
    queryKey: ['admin', 'invoices', { status, page }],
    queryFn: () => api.get<Paginated<InvoiceItem>>(`/invoices?${params.toString()}`),
    placeholderData: keepPreviousData,
  });
  const caseOptions = useQuery({
    queryKey: ['admin', 'cases', { limit: 100, purpose: 'invoice-options' }],
    queryFn: () => api.get<Paginated<CaseListItem>>('/cases?limit=100'),
    enabled: createOpen,
    select: (data) => data.items.filter((c) => c.status !== 'CLOSED').map((c) => ({ value: c.id, label: `${c.caseNumber} · ${c.title}` })),
  });

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['admin', 'invoices'] }),
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] }),
    ]);
  };

  const data = invoices.data;

  return (
    <div className="flex flex-col gap-6">
      <AdminPageTitle
        title="Нэхэмжлэх"
        description={isAdmin ? 'Бүх хэргийн нэхэмжлэх.' : 'Таны хариуцсан хэргүүдийн нэхэмжлэх.'}
        actions={<Button size="md" onClick={() => setCreateOpen(true)}><PlusIcon size={18} />Шинэ нэхэмжлэх</Button>}
      />
      <Select
        wrapperClassName="md:max-w-[260px]"
        label="Төлөв"
        value={status}
        onValueChange={(v) => { setStatus(v); setPage(1); }}
        options={[{ value: 'ALL', label: 'Бүх төлөв' }, ...INVOICE_STATUSES.map((s) => ({ value: s, label: INVOICE_STATUS_LABELS[s] }))]}
      />

      {invoices.isError ? (
        <ErrorState message={invoices.error instanceof ApiError ? invoices.error.message : 'Нэхэмжлэх ачаалахад алдаа гарлаа'} onRetry={() => void invoices.refetch()} />
      ) : !data ? (
        <TableSkeleton rows={6} />
      ) : data.items.length === 0 ? (
        <EmptyState title="Нэхэмжлэх алга" description={status === 'ALL' ? 'Хэргийн хуудаснаас эсвэл дээрх товчоор нэхэмжлэх үүсгэнэ.' : 'Энэ төлөвтэй нэхэмжлэх байхгүй.'} />
      ) : (
        <>
          <div className="hidden md:block">
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Дугаар</TableHeaderCell>
                  <TableHeaderCell>Хэрэг</TableHeaderCell>
                  <TableHeaderCell className="text-right">Дүн</TableHeaderCell>
                  <TableHeaderCell>Төлөх хугацаа</TableHeaderCell>
                  <TableHeaderCell>Төлөв</TableHeaderCell>
                  <TableHeaderCell className="text-right">Үйлдэл</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.items.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="py-2">
                      <span className="block whitespace-nowrap text-body-sm-medium text-text-primary">{inv.invoiceNumber}</span>
                      <span className="block max-w-[220px] truncate text-caption text-text-muted" title={inv.description}>{inv.description}</span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <Link href={`/admin/cases/${inv.case.id}`} className="focus-ring rounded-sm text-text-accent hover:underline" title={inv.case.title}>{inv.case.caseNumber}</Link>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right text-body-sm-medium text-text-primary">{formatMoney(inv.amount)}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatDate(inv.dueDate)}</TableCell>
                    <TableCell className="whitespace-nowrap"><StatusBadge map={INVOICE_STATUS_BADGE} status={inv.status} /></TableCell>
                    <TableCell className="py-2 text-right"><InvoiceActions invoice={inv} onChanged={refresh} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <ul className="grid gap-3 md:hidden">
            {data.items.map((inv) => (
              <li key={inv.id} className="flex flex-col gap-2 rounded-lg border border-border-default bg-bg-surface p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-caption text-text-muted">{inv.invoiceNumber}</span>
                  <StatusBadge map={INVOICE_STATUS_BADGE} status={inv.status} />
                </div>
                <p className="font-serif text-h4 text-text-brand">{formatMoney(inv.amount)}</p>
                <p className="text-body-sm text-text-secondary">{inv.description}</p>
                <p className="text-caption text-text-muted">
                  <Link href={`/admin/cases/${inv.case.id}`} className="focus-ring rounded-sm text-text-accent">{inv.case.caseNumber}</Link> · төлөх хугацаа {formatDate(inv.dueDate)}
                </p>
                <div className="flex justify-end"><InvoiceActions invoice={inv} onChanged={refresh} /></div>
              </li>
            ))}
          </ul>
          <Pagination className="justify-center" page={data.page} totalPages={data.totalPages} onPageChange={setPage} />
        </>
      )}

      <InvoiceModal open={createOpen} onOpenChange={setCreateOpen} caseOptions={caseOptions.data ?? []} onSaved={() => void refresh()} />
    </div>
  );
}
