'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AdminCreateUserSchema, ChangePasswordSchema, PhoneSchema, type ChangePasswordInput } from '@law-firm/shared/schemas';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { AdminPageTitle } from '@/components/admin/admin-page-title';
import { LawyerProfileForm } from '@/components/admin/lawyer-profile-form';
import { useUser } from '@/components/portal/user-context';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { CardSkeleton, ErrorState } from '@/components/ui/states';
import { toast } from '@/components/ui/toast';
import { ApiError, api } from '@/lib/api';
import type { StaffLawyer } from '@/lib/admin';
import { ROLE_LABELS, formatDate } from '@/lib/format';
import { initials } from '@/lib/utils';

const AccountSchema = z.object({
  lastName: AdminCreateUserSchema.shape.lastName,
  firstName: AdminCreateUserSchema.shape.firstName,
  phone: z.union([PhoneSchema, z.literal('')]),
});
type AccountValues = z.infer<typeof AccountSchema>;

export default function AdminProfilePage() {
  const { user, refresh } = useUser();
  const isLawyer = user.role === 'LAWYER';
  const queryClient = useQueryClient();

  const account = useForm<AccountValues>({
    resolver: zodResolver(AccountSchema),
    defaultValues: { lastName: user.lastName, firstName: user.firstName, phone: user.phone ?? '' },
  });
  const password = useForm<ChangePasswordInput>({ resolver: zodResolver(ChangePasswordSchema), defaultValues: { currentPassword: '', newPassword: '' } });

  const lawyer = useQuery({
    queryKey: ['admin', 'lawyer', user.id],
    queryFn: () => api.get<StaffLawyer>(`/lawyers/${user.id}/profile`),
    enabled: isLawyer,
  });

  const saveAccount = useMutation({
    mutationFn: (values: AccountValues) => api.patch('/users/me', { ...values, phone: values.phone || null }),
    onSuccess: async () => {
      toast.success('Хувийн мэдээлэл хадгалагдлаа');
      await refresh();
    },
    onError: (error) => toast.danger('Хадгалж чадсангүй', error instanceof ApiError ? error.message : undefined),
  });
  const changePassword = useMutation({
    mutationFn: (values: ChangePasswordInput) => api.patch('/users/me/password', values),
    onSuccess: () => {
      password.reset();
      toast.success('Нууц үг солигдлоо', 'Бусад төхөөрөмж дээрх нэвтрэлт хаагдсан.');
    },
    onError: (error) => {
      const message = error instanceof ApiError ? error.message : 'Алдаа гарлаа';
      password.setError('currentPassword', { message });
      toast.danger('Нууц үг солигдсонгүй', message);
    },
  });

  return (
    <div className="flex max-w-[900px] flex-col gap-6">
      <AdminPageTitle title="Профайл" description={isLawyer ? 'Бүртгэлийн мэдээлэл ба нийтийн сайтад харагдах профайл.' : 'Бүртгэлийн мэдээлэл ба нууц үг.'} />

      <Card className="flex flex-wrap items-center gap-5 p-6">
        <Avatar size="lg" initials={initials(user.firstName, user.lastName)} src={user.avatarUrl} />
        <div className="flex flex-col gap-1">
          <p className="text-h4">{user.lastName} {user.firstName}</p>
          <p className="text-body-sm text-text-secondary">{ROLE_LABELS[user.role]} · {user.email}</p>
          <p className="text-caption text-text-muted">Сүүлд нэвтэрсэн {formatDate(user.lastLoginAt, true)}</p>
        </div>
      </Card>

      {isLawyer && (
        lawyer.isError ? (
          <ErrorState message={lawyer.error instanceof ApiError ? lawyer.error.message : 'Профайл ачаалахад алдаа гарлаа'} onRetry={() => void lawyer.refetch()} />
        ) : !lawyer.data ? (
          <CardSkeleton />
        ) : (
          <LawyerProfileForm userId={user.id} profile={lawyer.data.lawyerProfile} onSaved={() => queryClient.invalidateQueries({ queryKey: ['admin', 'lawyer', user.id] })} />
        )
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h3 className="text-h4">Хувийн мэдээлэл</h3>
          <form onSubmit={account.handleSubmit((values) => saveAccount.mutate(values))} noValidate className="mt-5 flex flex-col gap-5">
            <Input label="Овог" required error={account.formState.errors.lastName?.message} {...account.register('lastName')} />
            <Input label="Нэр" required error={account.formState.errors.firstName?.message} {...account.register('firstName')} />
            <Input label="Утасны дугаар" inputMode="tel" error={account.formState.errors.phone?.message} {...account.register('phone')} />
            <Input label="И-мэйл" value={user.email} disabled readOnly helper="И-мэйлийг админ солино" />
            <div><Button type="submit" size="md" disabled={saveAccount.isPending}>Хадгалах</Button></div>
          </form>
        </Card>
        <Card className="p-6">
          <h3 className="text-h4">Нууц үг солих</h3>
          <form onSubmit={password.handleSubmit((values) => changePassword.mutate(values))} noValidate className="mt-5 flex flex-col gap-5">
            <Input label="Одоогийн нууц үг" type="password" autoComplete="current-password" required error={password.formState.errors.currentPassword?.message} {...password.register('currentPassword')} />
            <Input label="Шинэ нууц үг" type="password" autoComplete="new-password" required helper="Дор хаяж 8 тэмдэгт, үсэг ба тоо" error={password.formState.errors.newPassword?.message} {...password.register('newPassword')} />
            <div><Button type="submit" variant="secondary" size="md" disabled={changePassword.isPending}>Нууц үг солих</Button></div>
          </form>
        </Card>
      </div>
    </div>
  );
}
