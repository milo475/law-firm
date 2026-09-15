'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { CaseMemberRoleSchema, CreateCaseMemberSchema } from '@law-firm/shared/schemas';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { CASE_MEMBER_ROLE_BADGE } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal, ModalContent } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/states';
import { toast } from '@/components/ui/toast';
import { ApiError, api, type PublicUser } from '@/lib/api';
import { ROLE_LABELS } from '@/lib/format';
import { shortName } from '@/lib/utils';

const FormSchema = z.object({ userId: CreateCaseMemberSchema.shape.userId, role: CaseMemberRoleSchema });
type FormValues = z.infer<typeof FormSchema>;
type Candidate = PublicUser & { email: string };

/** Adds an active lawyer or admin who is not on the team yet; the API notifies them. */
export function AddCaseMemberModal({ open, onOpenChange, caseId, onSaved }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
  onSaved: () => void;
}) {
  const candidates = useQuery({
    queryKey: ['admin', 'case', caseId, 'member-candidates'],
    queryFn: () => api.get<Candidate[]>(`/cases/${caseId}/members/candidates`),
    enabled: open,
  });
  const form = useForm<FormValues>({ resolver: zodResolver(FormSchema), defaultValues: { userId: '', role: 'MEMBER' } });
  const { control, handleSubmit, reset, setValue, watch, formState: { errors } } = form;

  useEffect(() => {
    if (open) reset({ userId: '', role: 'MEMBER' });
  }, [open, reset]);

  const people = candidates.data ?? [];
  const selected = people.find((person) => person.id === watch('userId'));
  // Only a lawyer can lead a case.
  const leadAllowed = !selected || selected.role === 'LAWYER';

  const save = useMutation({
    mutationFn: (values: FormValues) => api.post(`/cases/${caseId}/members`, values),
    onSuccess: (_data, values) => {
      const person = people.find((candidate) => candidate.id === values.userId);
      toast.success('Багт нэмлээ', person ? `${shortName(person.firstName, person.lastName)}-д мэдэгдэл очлоо.` : undefined);
      onSaved();
      onOpenChange(false);
    },
    onError: (error) => toast.danger('Нэмж чадсангүй', error instanceof ApiError ? error.message : undefined),
  });

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent
        title="Багт гишүүн нэмэх"
        description="Нэмсэн ажилтан хэргийг нээж, хэргийн даалгавар хүлээн авах боломжтой болно."
        footer={
          <>
            <Button variant="ghost" size="md" onClick={() => onOpenChange(false)} disabled={save.isPending}>Болих</Button>
            <Button size="md" type="submit" form="add-case-member-form" disabled={save.isPending || people.length === 0}>{save.isPending ? 'Нэмж байна…' : 'Нэмэх'}</Button>
          </>
        }
      >
        {candidates.isLoading ? (
          <Skeleton className="h-28" />
        ) : candidates.isError ? (
          <p role="alert" className="text-body-sm text-status-danger-fg">{candidates.error instanceof ApiError ? candidates.error.message : 'Ажилтнуудыг ачаалж чадсангүй'}</p>
        ) : people.length === 0 ? (
          <p className="text-body-sm text-text-muted">Нэмэх боломжтой идэвхтэй хуульч, админ алга — бүгд аль хэдийн багт байна.</p>
        ) : (
          <form id="add-case-member-form" onSubmit={handleSubmit((values) => save.mutate(values))} noValidate className="flex flex-col gap-5">
            <Controller
              control={control}
              name="userId"
              render={({ field }) => (
                <Select
                  label="Ажилтан"
                  required
                  placeholder="Ажилтан сонгоно уу"
                  options={people.map((person) => ({ value: person.id, label: `${shortName(person.firstName, person.lastName)} · ${ROLE_LABELS[person.role]}` }))}
                  value={field.value || undefined}
                  onValueChange={(value) => {
                    field.onChange(value);
                    if (people.find((person) => person.id === value)?.role !== 'LAWYER') setValue('role', 'MEMBER');
                  }}
                  error={errors.userId?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="role"
              render={({ field }) => (
                <Select
                  label="Үүрэг"
                  options={[
                    { value: 'MEMBER', label: CASE_MEMBER_ROLE_BADGE.MEMBER.label },
                    { value: 'LEAD', label: CASE_MEMBER_ROLE_BADGE.LEAD.label, disabled: !leadAllowed },
                  ]}
                  value={field.value}
                  onValueChange={field.onChange}
                  helper={field.value === 'LEAD' ? 'Одоогийн ахлах хуульч гишүүн болж, хэргийн хариуцагч шинэ ахлахад шилжинэ.' : 'Ахлахаар зөвхөн хуульч томилогдоно.'}
                />
              )}
            />
          </form>
        )}
      </ModalContent>
    </Modal>
  );
}
