'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { ApiError, api } from '@/lib/api';
import type { InviteState } from '@/lib/admin';
import { formatDate } from '@/lib/format';

const LABEL: Record<InviteState['state'], { tone: 'new' | 'pending' | 'progress' | 'closed'; text: string }> = {
  NONE: { tone: 'closed', text: 'Урилга илгээгээгүй' },
  PENDING: { tone: 'pending', text: 'Урилга хүлээгдэж байна' },
  EXPIRED: { tone: 'closed', text: 'Урилгын хугацаа дууссан' },
  ACCEPTED: { tone: 'progress', text: 'Бүртгэлээ дуусгасан' },
};

/**
 * Where the invitation stands, and the one button that matters when it has expired or never arrived.
 * Sending again issues a new link and kills the old one.
 */
export function InviteRow({ userId, invite }: { userId: string; invite: InviteState }) {
  const queryClient = useQueryClient();
  const label = LABEL[invite.state];

  const resend = useMutation({
    mutationFn: () => api.post<{ expiresAt: string }>(`/users/${userId}/invite`),
    onSuccess: async (data) => {
      toast.success('Урилга дахин илгээлээ', `Холбоос ${formatDate(data.expiresAt)} хүртэл хүчинтэй.`);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'user', userId] });
    },
    onError: (error) => toast.danger('Илгээж чадсангүй', error instanceof ApiError ? error.message : undefined),
  });

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Badge tone={label.tone}>{label.text}</Badge>
      {invite.state === 'PENDING' && invite.expiresAt && (
        <span className="text-caption text-text-muted">{formatDate(invite.expiresAt)} хүртэл</span>
      )}
      {invite.state !== 'ACCEPTED' && (
        <Button variant="secondary" size="sm" disabled={resend.isPending} onClick={() => resend.mutate()}>
          {resend.isPending ? 'Илгээж байна…' : invite.state === 'NONE' ? 'Урилга илгээх' : 'Дахин илгээх'}
        </Button>
      )}
    </div>
  );
}
