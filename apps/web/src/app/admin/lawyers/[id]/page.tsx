'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { ConfirmModal } from '@/components/admin/confirm-modal';
import { EditUserModal } from '@/components/admin/edit-user-modal';
import { LawyerProfileForm } from '@/components/admin/lawyer-profile-form';
import { useUser } from '@/components/portal/user-context';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CardSkeleton, ErrorState, Skeleton } from '@/components/ui/states';
import { toast } from '@/components/ui/toast';
import { ApiError, api } from '@/lib/api';
import type { StaffLawyer } from '@/lib/admin';
import { initials, shortName } from '@/lib/utils';

export default function AdminLawyerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user: actor } = useUser();
  const isAdmin = actor.role === 'ADMIN';
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [toggleOpen, setToggleOpen] = useState(false);

  const lawyer = useQuery({ queryKey: ['admin', 'lawyer', id], queryFn: () => api.get<StaffLawyer>(`/lawyers/${id}/profile`), retry: false });

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['admin', 'lawyer', id] }),
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }),
    ]);
  };

  const toggleActive = useMutation({
    mutationFn: (isActive: boolean) => api.patch(`/users/${id}`, { isActive }),
    onSuccess: async (_d, isActive) => {
      toast.success(isActive ? 'Хуульч идэвхжлээ' : 'Хуульч идэвхгүй боллоо', isActive ? undefined : 'Нийтийн сайтаас нуугдаж, нэвтрэлт хаагдлаа.');
      setToggleOpen(false);
      await refresh();
    },
    onError: (error) => toast.danger('Төлөв солиход алдаа гарлаа', error instanceof ApiError ? error.message : undefined),
  });

  if (lawyer.isError) {
    const forbidden = lawyer.error instanceof ApiError && lawyer.error.status === 403;
    return (
      <div className="flex flex-col gap-4">
        <Breadcrumb items={[{ label: 'Хуульчид', href: '/admin/lawyers' }, { label: forbidden ? 'Хандах эрхгүй' : 'Олдсонгүй' }]} />
        <ErrorState title={forbidden ? '403 — Энэ профайлыг удирдах эрх танд байхгүй' : '404 — Хуульч олдсонгүй'} message={lawyer.error instanceof ApiError ? lawyer.error.message : undefined} />
      </div>
    );
  }
  if (!lawyer.data) return <div className="flex flex-col gap-6"><Skeleton className="h-4 w-48" /><CardSkeleton /><CardSkeleton /></div>;

  const l = lawyer.data;

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb items={[{ label: 'Хуульчид', href: isAdmin ? '/admin/lawyers' : '/admin/profile' }, { label: shortName(l.firstName, l.lastName) }]} />
      <Card className="flex flex-col gap-5 p-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Avatar size="lg" initials={initials(l.firstName, l.lastName)} src={l.avatarUrl} />
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-h3">{l.lastName} {l.firstName}</h2>
              {l.isActive ? <Badge tone="progress">Идэвхтэй</Badge> : <Badge tone="closed">Идэвхгүй</Badge>}
            </div>
            <p className="text-body-sm text-text-secondary">{l.lawyerProfile?.title ?? 'Профайл үүсгээгүй'}</p>
            <p className="text-caption text-text-muted">{l.email}{l.phone ? ` · ${l.phone}` : ''}</p>
          </div>
        </div>
        {isAdmin && (
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="ghost" size="md"><Link href={`/admin/cases?lawyerId=${l.id}`}>Хэргүүд</Link></Button>
            <Button variant="secondary" size="md" onClick={() => setEditOpen(true)}>Засах</Button>
            <Button variant={l.isActive ? 'ghost' : 'secondary'} size="md" onClick={() => setToggleOpen(true)}>{l.isActive ? 'Идэвхгүй болгох' : 'Идэвхжүүлэх'}</Button>
          </div>
        )}
      </Card>

      <LawyerProfileForm userId={l.id} profile={l.lawyerProfile} showSortOrder={isAdmin} onSaved={refresh} />

      {isAdmin && (
        <>
          <EditUserModal open={editOpen} onOpenChange={setEditOpen} user={l} onSaved={refresh} />
          <ConfirmModal
            open={toggleOpen}
            onOpenChange={setToggleOpen}
            title={l.isActive ? 'Идэвхгүй болгох' : 'Идэвхжүүлэх'}
            description={l.isActive ? 'Хуульч системд нэвтрэх боломжгүй болж, нийтийн сайтаас нуугдана. Хариуцсан хэргүүдийг өөр хуульчид шилжүүлэхээ мартуузай.' : 'Хуульч дахин нэвтэрч, профайл нь нийтийн сайтад (нийтэд нээлттэй бол) харагдана.'}
            confirmLabel={l.isActive ? 'Идэвхгүй болгох' : 'Идэвхжүүлэх'}
            variant={l.isActive ? 'danger' : 'primary'}
            pending={toggleActive.isPending}
            onConfirm={() => toggleActive.mutate(!l.isActive)}
          />
        </>
      )}
    </div>
  );
}
