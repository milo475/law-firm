'use client';

import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { AddCaseMemberModal } from '@/components/admin/add-case-member-modal';
import { ConfirmModal } from '@/components/admin/confirm-modal';
import { useCaseMembers } from '@/components/admin/queries';
import { PlusIcon } from '@/components/icons';
import { Avatar } from '@/components/ui/avatar';
import { CASE_MEMBER_ROLE_BADGE, StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/states';
import { toast } from '@/components/ui/toast';
import { ApiError, api, type CaseMemberItem } from '@/lib/api';
import { ROLE_LABELS, formatDate } from '@/lib/format';
import { cn, initials, shortName } from '@/lib/utils';

const memberName = (member: CaseMemberItem) => shortName(member.user.firstName, member.user.lastName);

/** "Баг" tab: lawyers and admins working on the case. Only the lead lawyer or an admin changes the team. */
export function CaseTeamTab({ caseId, viewerId, canManage, onChanged }: {
  caseId: string;
  viewerId: string;
  canManage: boolean;
  onChanged: () => Promise<void>;
}) {
  const members = useCaseMembers(caseId);
  const [addOpen, setAddOpen] = useState(false);
  const [toRemove, setToRemove] = useState<CaseMemberItem | null>(null);
  const [toPromote, setToPromote] = useState<CaseMemberItem | null>(null);

  const remove = useMutation({
    mutationFn: (member: CaseMemberItem) => api.delete(`/cases/${caseId}/members/${member.userId}`),
    onSuccess: async (_data, member) => {
      toast.success('Багаас хаслаа', `${memberName(member)} энэ хэрэгт хандах эрхгүй боллоо.`);
      setToRemove(null);
      await onChanged();
    },
    onError: (error) => toast.danger('Хасаж чадсангүй', error instanceof ApiError ? error.message : undefined),
  });
  const promote = useMutation({
    mutationFn: (member: CaseMemberItem) => api.patch(`/cases/${caseId}/members/${member.userId}`, { role: 'LEAD' }),
    onSuccess: async (_data, member) => {
      toast.success('Ахлах хуульч солигдлоо', `${memberName(member)} одоо хэргийг ахална.`);
      setToPromote(null);
      await onChanged();
    },
    onError: (error) => toast.danger('Ахлах хуульч сольж чадсангүй', error instanceof ApiError ? error.message : undefined),
  });

  const list = members.data ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <p className="min-w-0 flex-1 text-body-sm text-text-secondary">
          Багийн гишүүд хэргийг нээж, баримт, үйл явдал, даалгавар дээр ажиллана. Хэргийн мэдээлэл, багийг ахлах хуульч эсвэл админ удирдана.
        </p>
        {canManage && (
          <Button size="sm" className="shrink-0 self-start" onClick={() => setAddOpen(true)}><PlusIcon size={16} />Гишүүн нэмэх</Button>
        )}
      </div>
      {!canManage && (
        <p className="rounded-md bg-bg-surface-alt px-4 py-3 text-body-sm text-text-secondary">Гишүүн нэмэх, хасах эрх зөвхөн ахлах хуульч болон админд байна.</p>
      )}

      {members.isError ? (
        <ErrorState message={members.error instanceof ApiError ? members.error.message : 'Алдаа гарлаа'} onRetry={() => void members.refetch()} />
      ) : members.isLoading ? (
        <Skeleton className="h-32" />
      ) : list.length === 0 ? (
        <EmptyState title="Багийн гишүүн алга" />
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {list.map((member) => {
            const isLead = member.role === 'LEAD';
            return (
              <li
                key={member.id}
                aria-label={memberName(member)}
                className={cn('flex flex-col gap-4 rounded-lg border border-border-default bg-bg-surface p-5', isLead && 'border-l-[3px] border-l-status-progress-fg')}
              >
                <div className="flex items-start gap-3">
                  <Avatar initials={initials(member.user.firstName, member.user.lastName)} src={member.user.avatarUrl} />
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-body-medium text-text-primary">
                        {memberName(member)}
                        {member.userId === viewerId && <span className="text-body-sm text-text-muted"> (Та)</span>}
                      </p>
                      <StatusBadge map={CASE_MEMBER_ROLE_BADGE} status={member.role} />
                    </div>
                    <a href={`mailto:${member.user.email}`} className="focus-ring truncate rounded-sm text-body-sm text-text-accent hover:underline">{member.user.email}</a>
                    <p className="text-caption text-text-muted">{ROLE_LABELS[member.user.role]} · багт нэмсэн {formatDate(member.createdAt)}</p>
                  </div>
                </div>
                {canManage && !isLead && (
                  <div className="flex flex-wrap justify-end gap-2">
                    {member.user.role === 'LAWYER' && <Button variant="ghost" size="sm" onClick={() => setToPromote(member)}>Ахлах болгох</Button>}
                    <Button variant="secondary" size="sm" onClick={() => setToRemove(member)}>Хасах</Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <AddCaseMemberModal open={addOpen} onOpenChange={setAddOpen} caseId={caseId} onSaved={() => void onChanged()} />
      <ConfirmModal
        open={Boolean(toRemove)}
        onOpenChange={(open) => !open && setToRemove(null)}
        title="Багаас хасах"
        description={toRemove ? `${memberName(toRemove)}-г багаас хасах уу? Энэ хэргийг нээх, хэргийн даалгавар харах эрхгүй болно.` : ''}
        confirmLabel="Хасах"
        variant="danger"
        pending={remove.isPending}
        onConfirm={() => toRemove && remove.mutate(toRemove)}
      />
      <ConfirmModal
        open={Boolean(toPromote)}
        onOpenChange={(open) => !open && setToPromote(null)}
        title="Ахлах хуульч болгох"
        description={toPromote ? `${memberName(toPromote)} хэргийн ахлах хуульч болж, одоогийн ахлах хуульч гишүүн болно. Харилцагчийн мессеж, баримтын мэдэгдэл шинэ ахлахад очно.` : ''}
        confirmLabel="Ахлах болгох"
        pending={promote.isPending}
        onConfirm={() => toPromote && promote.mutate(toPromote)}
      />
    </div>
  );
}
