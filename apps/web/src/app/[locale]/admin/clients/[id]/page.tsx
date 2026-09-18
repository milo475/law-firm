'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { ConfirmModal } from '@/components/admin/confirm-modal';
import { EditUserModal } from '@/components/admin/edit-user-modal';
import { PlusIcon } from '@/components/icons';
import { useUser } from '@/components/portal/user-context';
import { Avatar } from '@/components/ui/avatar';
import { Badge, CASE_STATUS_BADGE, StatusBadge } from '@/components/ui/badge';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CardSkeleton, EmptyState, ErrorState, Skeleton } from '@/components/ui/states';
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '@/components/ui/table';
import { toast } from '@/components/ui/toast';
import { ApiError, api, type CaseListItem, type Paginated } from '@/lib/api';
import type { AdminUser } from '@/lib/admin';
import { CASE_TYPE_LABELS, formatDate } from '@/lib/format';
import { initials, shortName } from '@/lib/utils';

export default function AdminClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user: actor } = useUser();
  const isAdmin = actor.role === 'ADMIN';
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [toggleOpen, setToggleOpen] = useState(false);

  const client = useQuery({ queryKey: ['admin', 'user', id], queryFn: () => api.get<AdminUser>(`/users/${id}`), retry: false });
  const cases = useQuery({
    queryKey: ['admin', 'cases', { clientId: id }],
    queryFn: () => api.get<Paginated<CaseListItem>>(`/cases?clientId=${id}&limit=100`),
    enabled: client.isSuccess,
  });

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['admin', 'user', id] }),
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }),
    ]);
  };

  const toggleActive = useMutation({
    mutationFn: (isActive: boolean) => api.patch(`/users/${id}`, { isActive }),
    onSuccess: async (_d, isActive) => {
      toast.success(isActive ? 'Хэрэглэгч идэвхжлээ' : 'Хэрэглэгч идэвхгүй боллоо', isActive ? undefined : 'Бүх нэвтрэлт хаагдсан.');
      setToggleOpen(false);
      await refresh();
    },
    onError: (error) => toast.danger('Төлөв солиход алдаа гарлаа', error instanceof ApiError ? error.message : undefined),
  });

  if (client.isError) {
    const forbidden = client.error instanceof ApiError && client.error.status === 403;
    return (
      <div className="flex flex-col gap-4">
        <Breadcrumb items={[{ label: 'Харилцагчид', href: '/admin/clients' }, { label: forbidden ? 'Хандах эрхгүй' : 'Олдсонгүй' }]} />
        <ErrorState title={forbidden ? '403 — Энэ хэрэглэгчийг харах эрх танд байхгүй' : '404 — Харилцагч олдсонгүй'} message={client.error instanceof ApiError ? client.error.message : undefined} />
        <div><Button asChild variant="secondary" size="sm"><Link href="/admin/clients">Харилцагчид руу буцах</Link></Button></div>
      </div>
    );
  }
  if (!client.data) return <div className="flex flex-col gap-6"><Skeleton className="h-4 w-48" /><CardSkeleton /></div>;

  const c = client.data;

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb items={[{ label: 'Харилцагчид', href: '/admin/clients' }, { label: shortName(c.firstName, c.lastName) }]} />

      <Card className="flex flex-col gap-5 p-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Avatar size="lg" initials={initials(c.firstName, c.lastName)} src={c.avatarUrl} />
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-h3">{c.lastName} {c.firstName}</h2>
              {c.isActive ? <Badge tone="progress">Идэвхтэй</Badge> : <Badge tone="closed">Идэвхгүй</Badge>}
            </div>
            <p className="text-body-sm text-text-secondary">
              <a href={`mailto:${c.email}`} className="focus-ring rounded-sm text-text-accent hover:underline">{c.email}</a>
              {c.phone ? <> · <a href={`tel:${c.phone}`} className="focus-ring rounded-sm">{c.phone}</a></> : null}
            </p>
            <p className="text-caption text-text-muted">Бүртгүүлсэн {formatDate(c.createdAt)} · сүүлд нэвтэрсэн {formatDate(c.lastLoginAt, 'mn', true)}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild size="md"><Link href={`/admin/cases/new?clientId=${c.id}`}><PlusIcon size={18} />Шинэ хэрэг</Link></Button>
          {isAdmin && <Button variant="secondary" size="md" onClick={() => setEditOpen(true)}>Засах</Button>}
          {isAdmin && (
            <Button variant={c.isActive ? 'ghost' : 'secondary'} size="md" onClick={() => setToggleOpen(true)}>{c.isActive ? 'Идэвхгүй болгох' : 'Идэвхжүүлэх'}</Button>
          )}
        </div>
      </Card>

      <section className="flex flex-col gap-4">
        <h3 className="text-h4">Хэргүүд{isAdmin ? '' : ' (таны хариуцсан)'}</h3>
        {cases.isError ? (
          <ErrorState message={cases.error instanceof ApiError ? cases.error.message : 'Алдаа гарлаа'} onRetry={() => void cases.refetch()} />
        ) : cases.isLoading ? (
          <Skeleton className="h-32" />
        ) : (cases.data?.items.length ?? 0) === 0 ? (
          <EmptyState title="Хэрэг алга" description="Энэ харилцагчид бүртгэлтэй хэрэг байхгүй." action={<Button asChild size="sm"><Link href={`/admin/cases/new?clientId=${c.id}`}>Шинэ хэрэг</Link></Button>} />
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Дугаар</TableHeaderCell>
                <TableHeaderCell>Хэргийн нэр</TableHeaderCell>
                <TableHeaderCell>Төрөл</TableHeaderCell>
                <TableHeaderCell>Хуульч</TableHeaderCell>
                <TableHeaderCell>Төлөв</TableHeaderCell>
                <TableHeaderCell>Нээгдсэн</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {cases.data!.items.map((item) => (
                <TableRow key={item.id} interactive>
                  <TableCell className="whitespace-nowrap">{item.caseNumber}</TableCell>
                  <TableCell className="text-body-sm-medium text-text-primary"><Link href={`/admin/cases/${item.id}`} className="focus-ring rounded-sm hover:text-text-brand">{item.title}</Link></TableCell>
                  <TableCell>{CASE_TYPE_LABELS[item.type] ?? item.type}</TableCell>
                  <TableCell className="whitespace-nowrap">{shortName(item.lawyer.firstName, item.lawyer.lastName)}</TableCell>
                  <TableCell><StatusBadge map={CASE_STATUS_BADGE} status={item.status} /></TableCell>
                  <TableCell className="whitespace-nowrap">{formatDate(item.openedAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      {isAdmin && (
        <>
          <EditUserModal open={editOpen} onOpenChange={setEditOpen} user={c} onSaved={refresh} />
          <ConfirmModal
            open={toggleOpen}
            onOpenChange={setToggleOpen}
            title={c.isActive ? 'Идэвхгүй болгох' : 'Идэвхжүүлэх'}
            description={c.isActive ? 'Харилцагч порталд нэвтрэх боломжгүй болж, бүх нэвтрэлт хаагдана. Хэргийн мэдээлэл хадгалагдана.' : 'Харилцагч дахин порталд нэвтрэх боломжтой болно.'}
            confirmLabel={c.isActive ? 'Идэвхгүй болгох' : 'Идэвхжүүлэх'}
            variant={c.isActive ? 'danger' : 'primary'}
            pending={toggleActive.isPending}
            onConfirm={() => toggleActive.mutate(!c.isActive)}
          />
        </>
      )}
    </div>
  );
}
