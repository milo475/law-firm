'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { CreateCaseSchema } from '@law-firm/shared/schemas';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { AdminPageTitle } from '@/components/admin/admin-page-title';
import { useClientOptions, useLawyerOptions } from '@/components/admin/queries';
import { useUser } from '@/components/portal/user-context';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { CardSkeleton } from '@/components/ui/states';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';
import { ApiError, api, type CaseDetail } from '@/lib/api';
import { CASE_TYPES } from '@/lib/admin';
import { CASE_TYPE_LABELS } from '@/lib/format';

// Shared CreateCaseSchema; ids come from Selects as strings and ADMIN must also pick the lawyer.
const buildSchema = (isAdmin: boolean) =>
  CreateCaseSchema.omit({ openedAt: true }).extend({
    description: z.string().trim().max(5000, 'Тайлбар хэт урт байна'),
    clientId: z.string().min(1, 'Харилцагч сонгоно уу'),
    lawyerId: z.string(),
  }).superRefine((values, ctx) => {
    if (isAdmin && !values.lawyerId) ctx.addIssue({ code: 'custom', path: ['lawyerId'], message: 'Хариуцах хуульчийг сонгоно уу' });
  });
type NewCaseValues = z.infer<ReturnType<typeof buildSchema>>;

function NewCaseForm() {
  const { user } = useUser();
  const isAdmin = user.role === 'ADMIN';
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const clients = useClientOptions();
  const lawyers = useLawyerOptions(isAdmin);

  const { register, control, handleSubmit, formState: { errors } } = useForm<NewCaseValues>({
    resolver: zodResolver(buildSchema(isAdmin)),
    defaultValues: { title: '', type: 'CIVIL', clientId: searchParams.get('clientId') ?? '', lawyerId: '', description: '' },
  });

  const create = useMutation({
    mutationFn: (values: NewCaseValues) =>
      api.post<CaseDetail>('/cases', {
        title: values.title,
        type: values.type,
        clientId: values.clientId,
        description: values.description.trim() || null,
        ...(isAdmin ? { lawyerId: values.lawyerId } : {}),
      }),
    onSuccess: async (created) => {
      toast.success('Хэрэг үүслээ', `${created.caseNumber} дугаартай бүртгэгдлээ.`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin', 'cases'] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] }),
      ]);
      router.push(`/admin/cases/${created.id}`);
    },
    onError: (error) => toast.danger('Хэрэг үүсгэж чадсангүй', error instanceof ApiError ? error.message : undefined),
  });

  const noClients = clients.isSuccess && clients.data.length === 0;

  return (
    <div className="flex max-w-[800px] flex-col gap-6">
      <Breadcrumb items={[{ label: 'Хэргүүд', href: '/admin/cases' }, { label: 'Шинэ хэрэг' }]} />
      <AdminPageTitle title="Шинэ хэрэг" description="Хэргийн дугаар автоматаар олгогдоно. Шинэ хэрэг «Шинэ» төлөвтэй үүснэ." />
      <Card className="p-6 md:p-8">
        <form onSubmit={handleSubmit((values) => create.mutate(values))} noValidate className="flex flex-col gap-5">
          <Input label="Хэргийн нэр" placeholder="Жишээ: Хөдөлмөрийн гэрээ цуцалсан маргаан" required error={errors.title?.message} {...register('title')} />
          <div className="grid gap-5 sm:grid-cols-2">
            <Controller
              control={control}
              name="type"
              render={({ field }) => (
                <Select label="Хэргийн төрөл" required options={CASE_TYPES.map((t) => ({ value: t, label: CASE_TYPE_LABELS[t] }))} value={field.value} onValueChange={field.onChange} error={errors.type?.message} />
              )}
            />
            <Controller
              control={control}
              name="clientId"
              render={({ field }) => (
                <Select
                  label="Харилцагч"
                  required
                  placeholder={clients.isLoading ? 'Ачааллаж байна…' : 'Харилцагч сонгоно уу'}
                  options={clients.data ?? []}
                  value={field.value || undefined}
                  onValueChange={field.onChange}
                  disabled={clients.isLoading || noClients}
                  error={errors.clientId?.message}
                  helper={noClients ? 'Идэвхтэй харилцагч алга. Эхлээд харилцагч бүртгэнэ үү.' : undefined}
                />
              )}
            />
          </div>
          {isAdmin ? (
            <Controller
              control={control}
              name="lawyerId"
              render={({ field }) => (
                <Select label="Хариуцах хуульч" required placeholder="Хуульч сонгоно уу" options={lawyers.data ?? []} value={field.value || undefined} onValueChange={field.onChange} error={errors.lawyerId?.message} />
              )}
            />
          ) : (
            <p className="rounded-md bg-bg-brand-soft px-4 py-3 text-body-sm text-text-brand">Та энэ хэргийн хариуцах хуульчаар бүртгэгдэнэ.</p>
          )}
          <Textarea label="Тайлбар" rows={5} placeholder="Хэргийн товч агуулга, нэхэмжлэлийн шаардлага г.м." error={errors.description?.message} {...register('description')} />
          <div className="flex flex-wrap gap-3">
            <Button type="submit" size="md" disabled={create.isPending || noClients}>{create.isPending ? 'Үүсгэж байна…' : 'Хэрэг үүсгэх'}</Button>
            <Button asChild variant="ghost" size="md"><Link href="/admin/cases">Болих</Link></Button>
            {noClients && isAdmin && <Button asChild variant="secondary" size="md"><Link href="/admin/clients">Харилцагч бүртгэх</Link></Button>}
          </div>
        </form>
      </Card>
    </div>
  );
}

export default function NewCasePage() {
  return (
    <Suspense fallback={<CardSkeleton />}>
      <NewCaseForm />
    </Suspense>
  );
}
