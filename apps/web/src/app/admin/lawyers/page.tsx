'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
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
import { EmptyState, ErrorState, TableSkeleton } from '@/components/ui/states';
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '@/components/ui/table';
import { ApiError, api, type Paginated } from '@/lib/api';
import type { AdminUser } from '@/lib/admin';
import { shortName } from '@/lib/utils';

export default function AdminLawyersPage() {
  const { user } = useUser();
  const isAdmin = user.role === 'ADMIN';
  const router = useRouter();

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const params = new URLSearchParams({ role: 'LAWYER', page: String(page), limit: '20' });
  if (search) params.set('search', search);
  const lawyers = useQuery({
    queryKey: ['admin', 'users', { role: 'LAWYER', search, page }],
    queryFn: () => api.get<Paginated<AdminUser>>(`/users?${params.toString()}`),
    placeholderData: keepPreviousData,
    enabled: isAdmin,
  });

  if (!isAdmin) {
    return (
      <div className="flex flex-col gap-4">
        <ErrorState title="403 — Энэ хэсэг зөвхөн админд" message="Өөрийн нийтийн профайлыг «Профайл» хэсгээс засна." />
        <div><Button asChild variant="secondary" size="sm"><Link href="/admin/profile">Профайл руу очих</Link></Button></div>
      </div>
    );
  }

  const data = lawyers.data;

  return (
    <div className="flex flex-col gap-6">
      <AdminPageTitle
        title="Хуульчид"
        description="Хуульчдын бүртгэл ба нийтийн сайтад харагдах профайл."
        actions={<Button size="md" onClick={() => setCreateOpen(true)}><PlusIcon size={18} />Шинэ хуульч</Button>}
      />
      <Input wrapperClassName="md:max-w-[420px]" label="Хайх" type="search" placeholder="Нэр, и-мэйл эсвэл утас" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />

      {lawyers.isError ? (
        <ErrorState message={lawyers.error instanceof ApiError ? lawyers.error.message : 'Хуульч ачаалахад алдаа гарлаа'} onRetry={() => void lawyers.refetch()} />
      ) : !data ? (
        <TableSkeleton rows={4} />
      ) : data.items.length === 0 ? (
        <EmptyState title="Хуульч олдсонгүй" />
      ) : (
        <>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Нэр</TableHeaderCell>
                <TableHeaderCell>Албан тушаал</TableHeaderCell>
                <TableHeaderCell>И-мэйл</TableHeaderCell>
                <TableHeaderCell>Туршлага</TableHeaderCell>
                <TableHeaderCell>Нийтийн сайт</TableHeaderCell>
                <TableHeaderCell>Бүртгэл</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.items.map((l) => (
                <TableRow key={l.id} interactive className="cursor-pointer" onClick={() => router.push(`/admin/lawyers/${l.id}`)}>
                  <TableCell className="whitespace-nowrap text-body-sm-medium text-text-primary">
                    <Link href={`/admin/lawyers/${l.id}`} className="focus-ring rounded-sm" onClick={(e) => e.stopPropagation()}>{shortName(l.firstName, l.lastName)}</Link>
                  </TableCell>
                  <TableCell>{l.lawyerProfile?.title ?? <span className="text-text-muted">—</span>}</TableCell>
                  <TableCell>{l.email}</TableCell>
                  <TableCell className="whitespace-nowrap">{l.lawyerProfile ? `${l.lawyerProfile.yearsOfExperience} жил` : '—'}</TableCell>
                  <TableCell>
                    {!l.lawyerProfile ? <Badge tone="pending">Профайлгүй</Badge> : l.lawyerProfile.isPublic ? <Badge tone="progress">Харагдана</Badge> : <Badge tone="closed">Нуусан</Badge>}
                  </TableCell>
                  <TableCell>{l.isActive ? <Badge tone="progress">Идэвхтэй</Badge> : <Badge tone="closed">Идэвхгүй</Badge>}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination className="justify-center" page={data.page} totalPages={data.totalPages} onPageChange={setPage} />
        </>
      )}

      <CreateUserModal open={createOpen} onOpenChange={setCreateOpen} role="LAWYER" onCreated={(created) => router.push(`/admin/lawyers/${created.id}`)} />
    </div>
  );
}
