'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { AdminPageTitle } from '@/components/admin/admin-page-title';
import { useLawyerOptions } from '@/components/admin/queries';
import { PlusIcon } from '@/components/icons';
import { useUser } from '@/components/portal/user-context';
import { CASE_STATUS_BADGE, StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import { Select } from '@/components/ui/select';
import { EmptyState, ErrorState, TableSkeleton } from '@/components/ui/states';
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '@/components/ui/table';
import { ApiError, api, type CaseListItem, type Paginated } from '@/lib/api';
import { CASE_STATUSES, CASE_TYPES } from '@/lib/admin';
import { CASE_STATUS_LABELS, CASE_TYPE_LABELS, formatDate } from '@/lib/format';
import { shortName } from '@/lib/utils';

const ALL = 'ALL';
const PAGE_SIZE = 20;

function AdminCasesContent() {
  const { user } = useUser();
  const isAdmin = user.role === 'ADMIN';
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const status = searchParams.get('status') ?? '';
  const type = searchParams.get('type') ?? '';
  const lawyerId = searchParams.get('lawyerId') ?? '';
  const search = searchParams.get('search') ?? '';
  const page = Math.max(1, Number(searchParams.get('page')) || 1);

  const setParams = useCallback(
    (updates: Record<string, string>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value && value !== ALL) next.set(key, value);
        else next.delete(key);
      }
      if (!('page' in updates)) next.delete('page');
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  // Debounced search box synced to ?search=
  const [searchInput, setSearchInput] = useState(search);
  useEffect(() => setSearchInput(search), [search]);
  useEffect(() => {
    if (searchInput.trim() === search) return;
    const timer = setTimeout(() => setParams({ search: searchInput.trim() }), 350);
    return () => clearTimeout(timer);
  }, [searchInput, search, setParams]);

  const query = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
  if (status) query.set('status', status);
  if (type) query.set('type', type);
  if (lawyerId && isAdmin) query.set('lawyerId', lawyerId);
  if (search) query.set('search', search);

  const cases = useQuery({
    queryKey: ['admin', 'cases', { status, type, lawyerId, search, page }],
    queryFn: () => api.get<Paginated<CaseListItem>>(`/cases?${query.toString()}`),
    placeholderData: keepPreviousData,
  });
  const lawyers = useLawyerOptions(isAdmin);

  const data = cases.data;
  const hasFilters = Boolean(status || type || lawyerId || search);

  return (
    <div className="flex flex-col gap-6">
      <AdminPageTitle
        title="Хэргүүд"
        description={isAdmin ? 'Фирмийн бүх хэрэг.' : 'Таны хариуцсан хэргүүд.'}
        actions={<Button asChild size="md"><Link href="/admin/cases/new"><PlusIcon size={18} />Шинэ хэрэг</Link></Button>}
      />

      <div className={`grid gap-4 md:grid-cols-2 ${isAdmin ? 'xl:grid-cols-4' : 'xl:grid-cols-3'}`}>
        <Input label="Хайх" type="search" placeholder="Хэргийн дугаар эсвэл нэр" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
        <Select
          label="Төлөв"
          value={status || ALL}
          onValueChange={(v) => setParams({ status: v })}
          options={[{ value: ALL, label: 'Бүх төлөв' }, ...CASE_STATUSES.map((s) => ({ value: s, label: CASE_STATUS_LABELS[s] }))]}
        />
        <Select
          label="Төрөл"
          value={type || ALL}
          onValueChange={(v) => setParams({ type: v })}
          options={[{ value: ALL, label: 'Бүх төрөл' }, ...CASE_TYPES.map((t) => ({ value: t, label: CASE_TYPE_LABELS[t] }))]}
        />
        {isAdmin && (
          <Select
            label="Хуульч"
            value={lawyerId || ALL}
            onValueChange={(v) => setParams({ lawyerId: v })}
            options={[{ value: ALL, label: 'Бүх хуульч' }, ...(lawyers.data ?? [])]}
          />
        )}
      </div>

      {cases.isError ? (
        <ErrorState message={cases.error instanceof ApiError ? cases.error.message : 'Хэрэг ачаалахад алдаа гарлаа'} onRetry={() => void cases.refetch()} />
      ) : !data ? (
        <TableSkeleton rows={6} />
      ) : data.items.length === 0 ? (
        <EmptyState
          title={hasFilters ? 'Шүүлтүүрт тохирох хэрэг алга' : 'Хэрэг бүртгэгдээгүй байна'}
          description={hasFilters ? 'Шүүлтүүрээ өөрчилж дахин оролдоно уу.' : 'Шинэ хэрэг үүсгэхэд энд харагдана.'}
          action={
            hasFilters ? (
              <Button variant="secondary" size="sm" onClick={() => { setSearchInput(''); setParams({ status: '', type: '', lawyerId: '', search: '' }); }}>Шүүлтүүр цэвэрлэх</Button>
            ) : (
              <Button asChild size="sm"><Link href="/admin/cases/new">Шинэ хэрэг</Link></Button>
            )
          }
        />
      ) : (
        <>
          <p className="text-body-sm text-text-muted">Нийт {data.total} хэрэг</p>
          <div className="hidden md:block">
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell className="w-[140px]">Дугаар</TableHeaderCell>
                  <TableHeaderCell>Хэргийн нэр</TableHeaderCell>
                  <TableHeaderCell>Харилцагч</TableHeaderCell>
                  {isAdmin && <TableHeaderCell>Хуульч</TableHeaderCell>}
                  <TableHeaderCell>Төрөл</TableHeaderCell>
                  <TableHeaderCell>Төлөв</TableHeaderCell>
                  <TableHeaderCell>Шинэчлэгдсэн</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.items.map((c) => (
                  <TableRow key={c.id} interactive className="cursor-pointer" onClick={() => router.push(`/admin/cases/${c.id}`)}>
                    <TableCell className="whitespace-nowrap">{c.caseNumber}</TableCell>
                    <TableCell className="text-body-sm-medium text-text-primary">
                      <Link href={`/admin/cases/${c.id}`} className="focus-ring rounded-sm" onClick={(e) => e.stopPropagation()}>{c.title}</Link>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{shortName(c.client.firstName, c.client.lastName)}</TableCell>
                    {isAdmin && <TableCell className="whitespace-nowrap">{shortName(c.lawyer.firstName, c.lawyer.lastName)}</TableCell>}
                    <TableCell>{CASE_TYPE_LABELS[c.type] ?? c.type}</TableCell>
                    <TableCell><StatusBadge map={CASE_STATUS_BADGE} status={c.status} /></TableCell>
                    <TableCell className="whitespace-nowrap">{formatDate(c.updatedAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <ul className="grid gap-3 md:hidden">
            {data.items.map((c) => (
              <li key={c.id}>
                <Link href={`/admin/cases/${c.id}`} className="focus-ring flex flex-col gap-2 rounded-lg border border-border-default bg-bg-surface p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-caption text-text-muted">{c.caseNumber}</span>
                    <StatusBadge map={CASE_STATUS_BADGE} status={c.status} />
                  </div>
                  <p className="text-body-medium text-text-primary">{c.title}</p>
                  <p className="text-caption text-text-muted">{shortName(c.client.firstName, c.client.lastName)} · {CASE_TYPE_LABELS[c.type] ?? c.type} · {formatDate(c.updatedAt)}</p>
                </Link>
              </li>
            ))}
          </ul>
          <Pagination className="justify-center" page={data.page} totalPages={data.totalPages} onPageChange={(p) => setParams({ page: String(p) })} />
        </>
      )}
    </div>
  );
}

export default function AdminCasesPage() {
  return (
    <Suspense fallback={<TableSkeleton rows={6} />}>
      <AdminCasesContent />
    </Suspense>
  );
}
