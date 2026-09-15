'use client';

import { AssignServiceRequestSchema } from '@law-firm/shared/schemas';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useLawyerOptions } from '@/components/admin/queries';
import { Button } from '@/components/ui/button';
import { Modal, ModalContent } from '@/components/ui/modal';
import { Skeleton } from '@/components/ui/states';
import { toast } from '@/components/ui/toast';
import { ApiError, api, type ServiceRequestItem, type SuggestedLawyer, type SuggestedLawyers } from '@/lib/api';
import { CASE_TYPE_LABELS } from '@/lib/format';
import { cn, shortName } from '@/lib/utils';

type Mode = 'single' | 'team';
interface Candidate {
  id: string;
  name: string;
  detail: string | null;
  suggested: boolean;
}

const describe = (lawyer: SuggestedLawyer) =>
  [lawyer.title, lawyer.specializations.join(', '), `${lawyer.openCases} нээлттэй хэрэг`].filter(Boolean).join(' · ');

/**
 * ACCEPTED → assign one lawyer or a team with a lead. Lawyers specialised in the request's area come first
 * (GET /service-requests/:id/suggested-lawyers); every other active lawyer can still be picked.
 */
export function AssignRequestModal({ request, open, onOpenChange, onAssigned }: {
  request: ServiceRequestItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAssigned: () => void | Promise<void>;
}) {
  const suggestions = useQuery({
    queryKey: ['service-requests', 'detail', request.id, 'suggested-lawyers'],
    queryFn: () => api.get<SuggestedLawyers>(`/service-requests/${request.id}/suggested-lawyers`),
    enabled: open,
  });
  const lawyers = useLawyerOptions(open);
  const [mode, setMode] = useState<Mode>('single');
  const [selected, setSelected] = useState<string[]>([]);
  const [leadId, setLeadId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setMode('single');
    setSelected([]);
    setLeadId(null);
    setError(null);
  }, [open]);

  const candidates = useMemo<Candidate[]>(() => {
    const info = new Map((suggestions.data?.items ?? []).map((lawyer) => [lawyer.id, lawyer]));
    const rows: Candidate[] = suggestions.data?.matched
      ? suggestions.data.items.map((lawyer) => ({ id: lawyer.id, name: shortName(lawyer.firstName, lawyer.lastName), detail: describe(lawyer), suggested: true }))
      : [];
    for (const option of lawyers.data ?? []) {
      if (rows.some((row) => row.id === option.value)) continue;
      const known = info.get(option.value);
      rows.push({ id: option.value, name: option.label, detail: known ? describe(known) : null, suggested: false });
    }
    return rows;
  }, [suggestions.data, lawyers.data]);

  const toggle = (id: string) => {
    setError(null);
    if (mode === 'single') {
      setSelected([id]);
      setLeadId(id);
      return;
    }
    const next = selected.includes(id) ? selected.filter((value) => value !== id) : [...selected, id];
    setSelected(next);
    if (!leadId || !next.includes(leadId)) setLeadId(next[0] ?? null);
  };

  const changeMode = (value: Mode) => {
    setMode(value);
    setSelected([]);
    setLeadId(null);
    setError(null);
  };

  const body = mode === 'single'
    ? { lawyerId: selected[0] }
    : { leadId: leadId ?? undefined, memberIds: selected.filter((id) => id !== leadId) };

  const assign = useMutation({
    mutationFn: () => api.post<ServiceRequestItem>(`/service-requests/${request.id}/assign`, body),
    onSuccess: async (updated) => {
      toast.success('Хэрэг нээгдлээ', `${updated.assignedCase?.caseNumber ?? ''} — өмгөөлөгч болон харилцагчид мэдэгдэл очлоо.`);
      onOpenChange(false);
      await onAssigned();
    },
    onError: (err) => toast.danger('Хуваарилж чадсангүй', err instanceof ApiError ? err.message : undefined),
  });

  const submit = () => {
    const parsed = AssignServiceRequestSchema.safeParse(body);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Сонголтоо шалгана уу');
      return;
    }
    assign.mutate();
  };

  const loading = suggestions.isLoading || lawyers.isLoading;

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent
        size="lg"
        title="Өмгөөлөгч хуваарилах"
        description={`Хуваарилахад «${request.title}» хүсэлтээр ${CASE_TYPE_LABELS[request.caseType] ?? 'шинэ'} хэрэг нээгдэж, харилцагч түүнийг порталаас харна.`}
        footer={
          <>
            <Button variant="ghost" size="md" onClick={() => onOpenChange(false)} disabled={assign.isPending}>Болих</Button>
            <Button size="md" onClick={submit} disabled={assign.isPending || loading}>{assign.isPending ? 'Хэрэг нээж байна…' : 'Хуваарилж хэрэг нээх'}</Button>
          </>
        }
      >
        <div role="radiogroup" aria-label="Хуваарилах хэлбэр" className="grid grid-cols-2 gap-2">
          {([['single', 'Нэг өмгөөлөгч'], ['team', 'Баг']] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={mode === value}
              onClick={() => changeMode(value)}
              className={cn(
                'focus-ring inline-flex h-11 items-center justify-center rounded-full px-4 text-body-sm-medium transition-colors',
                mode === value ? 'bg-brand-primary text-text-on-inverse' : 'border border-border-default bg-bg-surface text-text-secondary hover:bg-bg-brand-soft',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <Skeleton className="h-48" />
        ) : candidates.length === 0 ? (
          <p className="text-body-sm text-text-muted">Идэвхтэй өмгөөлөгч бүртгэлгүй байна.</p>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-caption text-text-muted">
              {suggestions.data?.matched
                ? 'Мэргэшил нь таарсан өмгөөлөгчид эхэнд, нээлттэй хэрэг цөөнөөс нь эрэмбэлсэн.'
                : 'Энэ чиглэлээр мэргэшсэн өмгөөлөгч бүртгэлгүй тул бүх идэвхтэй өмгөөлөгчийг харуулж байна.'}
              {mode === 'team' ? ' Багийн гишүүдийг сонгоод нэгийг нь ахлах болгоно.' : ''}
            </p>
            <div role={mode === 'single' ? 'radiogroup' : 'group'} aria-label="Өмгөөлөгчид" className="flex max-h-[340px] flex-col gap-2 overflow-y-auto">
              {candidates.map((candidate) => {
                const checked = selected.includes(candidate.id);
                const isLead = mode === 'team' && leadId === candidate.id;
                return (
                  <div
                    key={candidate.id}
                    className={cn('flex items-center gap-3 rounded-md border px-3 py-2.5', checked ? 'border-brand-primary bg-bg-brand-soft' : 'border-border-default bg-bg-surface')}
                  >
                    <button
                      type="button"
                      role={mode === 'single' ? 'radio' : 'checkbox'}
                      aria-checked={checked}
                      onClick={() => toggle(candidate.id)}
                      className="focus-ring flex min-w-0 flex-1 flex-col gap-0.5 rounded-sm text-left"
                    >
                      <span className="flex flex-wrap items-center gap-2 text-body-medium text-text-primary">
                        {candidate.name}
                        {candidate.suggested && <span className="rounded-full bg-status-progress-bg px-2 py-0.5 text-caption text-status-progress-fg">Мэргэшил таарсан</span>}
                      </span>
                      {candidate.detail && <span className="text-caption text-text-muted">{candidate.detail}</span>}
                    </button>
                    {mode === 'team' && checked && (
                      <Button type="button" size="sm" variant={isLead ? 'primary' : 'ghost'} aria-pressed={isLead} onClick={() => setLeadId(candidate.id)}>
                        {isLead ? 'Ахлах' : 'Ахлах болгох'}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {error && <p role="alert" className="text-body-sm text-status-danger-fg">{error}</p>}
      </ModalContent>
    </Modal>
  );
}
