'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { CASE_STATUS_BADGE, StatusBadge } from '@/components/ui/badge';
import { CaseCard } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { EmptyState, ErrorState, TableSkeleton } from '@/components/ui/states';
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '@/components/ui/table';
import { ApiError, api, type CaseListItem, type Paginated } from '@/lib/api';
import { CASE_STATUS_LABELS, CASE_TYPE_LABELS, formatDate } from '@/lib/format';
import { shortName } from '@/lib/utils';

const STATUS_OPTIONS = [{ value: 'ALL', label: 'Бүх төлөв' }, ...Object.entries(CASE_STATUS_LABELS).map(([value, label]) => ({ value, label }))];

export default function CasesPage() {
  const router = useRouter();
  const [status, setStatus] = useState('ALL');
  const query = useQuery({
    queryKey: ['cases', status],
    queryFn: () => api.get<Paginated<CaseListItem>>(`/cases?limit=50${status !== 'ALL' ? `&status=${status}` : ''}`),
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-h3">Хэргүүд</h2>
          <p className="mt-1 text-body-sm text-text-secondary">Танд хамаарах бүх хэргийн жагсаалт.</p>
        </div>
        <Select wrapperClassName="md:w-[220px]" label="Төлөв" options={STATUS_OPTIONS} value={status} onValueChange={setStatus} />
      </div>

      {query.isError ? (
        <ErrorState message={query.error instanceof ApiError ? query.error.message : 'Алдаа гарлаа'} onRetry={() => void query.refetch()} />
      ) : query.isLoading ? (
        <TableSkeleton />
      ) : query.data!.items.length === 0 ? (
        <EmptyState title="Хэрэг олдсонгүй" description={status === 'ALL' ? 'Таны нэр дээр хэрэг бүртгэгдээгүй байна.' : 'Энэ төлөвтэй хэрэг байхгүй.'} />
      ) : (
        <>
          {/* Desktop table — Figma "Table row" 6 columns */}
          <div className="hidden md:block">
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell className="w-[140px]">Дугаар</TableHeaderCell>
                  <TableHeaderCell>Хэргийн нэр</TableHeaderCell>
                  <TableHeaderCell className="w-[180px]">Төрөл</TableHeaderCell>
                  <TableHeaderCell className="w-[200px]">Хариуцсан хуульч</TableHeaderCell>
                  <TableHeaderCell className="w-[160px]">Статус</TableHeaderCell>
                  <TableHeaderCell className="w-[160px]">Шинэчлэгдсэн</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {query.data!.items.map((c) => (
                  <TableRow key={c.id} interactive className="cursor-pointer" onClick={() => router.push(`/portal/cases/${c.id}`)}>
                    <TableCell>{c.caseNumber}</TableCell>
                    <TableCell className="text-body-sm-medium text-text-primary">
                      <Link href={`/portal/cases/${c.id}`} className="focus-ring rounded-sm" onClick={(e) => e.stopPropagation()}>{c.title}</Link>
                    </TableCell>
                    <TableCell>{CASE_TYPE_LABELS[c.type] ?? c.type}</TableCell>
                    <TableCell>{shortName(c.lawyer.firstName, c.lawyer.lastName)}</TableCell>
                    <TableCell><StatusBadge map={CASE_STATUS_BADGE} status={c.status} /></TableCell>
                    <TableCell>{formatDate(c.updatedAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {/* Mobile cards */}
          <div className="grid gap-4 md:hidden">
            {query.data!.items.map((c) => (
              <CaseCard key={c.id} caseNumber={c.caseNumber} title={c.title} status={CASE_STATUS_BADGE[c.status]} lawyer={c.lawyer} href={`/portal/cases/${c.id}`} footer={`${CASE_TYPE_LABELS[c.type] ?? c.type} · ${formatDate(c.updatedAt)}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
