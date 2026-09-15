'use client';

import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AdminPageTitle } from '@/components/admin/admin-page-title';
import { CreateUserModal } from '@/components/admin/create-user-modal';
import { PlusIcon } from '@/components/icons';
import { useUser } from '@/components/portal/user-context';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import { Select } from '@/components/ui/select';
import { EmptyState, ErrorState, TableSkeleton } from '@/components/ui/states';
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '@/components/ui/table';
import { ApiError, api, type Paginated } from '@/lib/api';
import type { AdminUser } from '@/lib/admin';
import { formatDate } from '@/lib/format';
import { shortName } from '@/lib/utils';

export default function AdminClientsPage() {
  const { user } = useUser();
  const isAdmin = user.role === 'ADMIN';
  const router = useRouter();
  const queryClient = useQueryClient();

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [active, setActive] = useState('ALL');
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const params = new URLSearchParams({ role: 'CLIENT', page: String(page), limit: '20' });
  if (search) params.set('search', search);
  if (active !== 'ALL') params.set('isActive', active);

  const clients = useQuery({
    queryKey: ['admin', 'users', { role: 'CLIENT', search, active, page }],
    queryFn: () => api.get<Paginated<AdminUser>>(`/users?${params.toString()}`),
    placeholderData: keepPreviousData,
  });
  const data = clients.data;

  return (
    <div className="flex flex-col gap-6">
      <AdminPageTitle
        title="Харилцагчид"
        description={isAdmin ? 'Порталд бүртгэлтэй бүх харилцагч.' : 'Хэрэг үүсгэхэд сонгох харилцагчид. Шинэ харилцагчийг админ бүртгэнэ.'}
        actions={isAdmin ? <Button size="md" onClick={() => setCreateOpen(true)}><PlusIcon size={18} />Шинэ харилцагч</Button> : undefined}
      />

      <div className="grid gap-4 md:grid-cols-[1fr_220px]">
        <Input label="Хайх" type="search" placeholder="Нэр, и-мэйл эсвэл утас" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
        <Select
          label="Төлөв"
          value={active}
          onValueChange={(v) => { setActive(v); setPage(1); }}
          options={[{ value: 'ALL', label: 'Бүгд' }, { value: 'true', label: 'Идэвхтэй' }, { value: 'false', label: 'Идэвхгүй' }]}
        />
      </div>

      {clients.isError ? (
        <ErrorState message={clients.error instanceof ApiError ? clients.error.message : 'Харилцагч ачаалахад алдаа гарлаа'} onRetry={() => void clients.refetch()} />
      ) : !data ? (
        <TableSkeleton rows={6} />
      ) : data.items.length === 0 ? (
        <EmptyState
          title={search || active !== 'ALL' ? 'Тохирох харилцагч олдсонгүй' : 'Харилцагч бүртгэгдээгүй байна'}
          action={isAdmin && !search ? <Button size="sm" onClick={() => setCreateOpen(true)}>Шинэ харилцагч</Button> : undefined}
        />
      ) : (
        <>
          <p className="text-body-sm text-text-muted">Нийт {data.total} харилцагч</p>
          <div className="hidden md:block">
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Нэр</TableHeaderCell>
                  <TableHeaderCell>И-мэйл</TableHeaderCell>
                  <TableHeaderCell>Утас</TableHeaderCell>
                  <TableHeaderCell>Төлөв</TableHeaderCell>
                  <TableHeaderCell>Бүртгүүлсэн</TableHeaderCell>
                  <TableHeaderCell>Сүүлд нэвтэрсэн</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.items.map((c) => (
                  <TableRow key={c.id} interactive className="cursor-pointer" onClick={() => router.push(`/admin/clients/${c.id}`)}>
                    <TableCell className="whitespace-nowrap text-body-sm-medium text-text-primary">
                      <Link href={`/admin/clients/${c.id}`} className="focus-ring rounded-sm" onClick={(e) => e.stopPropagation()}>{c.lastName} {c.firstName}</Link>
                    </TableCell>
                    <TableCell>{c.email}</TableCell>
                    <TableCell className="whitespace-nowrap">{c.phone ?? '—'}</TableCell>
                    <TableCell>{c.isActive ? <Badge tone="progress">Идэвхтэй</Badge> : <Badge tone="closed">Идэвхгүй</Badge>}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatDate(c.createdAt)}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatDate(c.lastLoginAt, true)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <ul className="grid gap-3 md:hidden">
            {data.items.map((c) => (
              <li key={c.id}>
                <Link href={`/admin/clients/${c.id}`} className="focus-ring flex flex-col gap-1 rounded-lg border border-border-default bg-bg-surface p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-body-medium text-text-primary">{shortName(c.firstName, c.lastName)}</span>
                    {c.isActive ? <Badge tone="progress">Идэвхтэй</Badge> : <Badge tone="closed">Идэвхгүй</Badge>}
                  </div>
                  <span className="text-body-sm text-text-secondary">{c.email}</span>
                  <span className="text-caption text-text-muted">{c.phone ?? 'Утасгүй'} · {formatDate(c.createdAt)}</span>
                </Link>
              </li>
            ))}
          </ul>
          <Pagination className="justify-center" page={data.page} totalPages={data.totalPages} onPageChange={setPage} />
        </>
      )}

      {isAdmin && (
        <CreateUserModal
          open={createOpen}
          onOpenChange={setCreateOpen}
          role="CLIENT"
          onCreated={() => void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })}
        />
      )}
    </div>
  );
}
