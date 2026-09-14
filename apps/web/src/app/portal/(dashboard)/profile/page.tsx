'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ChangePasswordSchema, PhoneSchema, type ChangePasswordInput } from '@law-firm/shared/schemas';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useUser } from '@/components/portal/user-context';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toast';
import { ApiError, api } from '@/lib/api';
import { ROLE_LABELS, formatDate } from '@/lib/format';
import { initials } from '@/lib/utils';

const ProfileSchema = z.object({
  lastName: z.string().trim().min(2, 'Овог хамгийн багадаа 2 тэмдэгт байна').max(64),
  firstName: z.string().trim().min(2, 'Нэр хамгийн багадаа 2 тэмдэгт байна').max(64),
  phone: z.union([PhoneSchema, z.literal('')]),
});
type ProfileInput = z.infer<typeof ProfileSchema>;

export default function ProfilePage() {
  const { user, refresh } = useUser();

  const profile = useForm<ProfileInput>({
    resolver: zodResolver(ProfileSchema),
    defaultValues: { lastName: user.lastName, firstName: user.firstName, phone: user.phone ?? '' },
  });
  const password = useForm<ChangePasswordInput>({
    resolver: zodResolver(ChangePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '' },
  });

  async function saveProfile(values: ProfileInput) {
    try {
      await api.patch('/users/me', { ...values, phone: values.phone || null });
      await refresh();
      toast.success('Профайл хадгалагдлаа');
    } catch (error) {
      toast.danger('Хадгалж чадсангүй', error instanceof ApiError ? error.message : undefined);
    }
  }

  async function changePassword(values: ChangePasswordInput) {
    try {
      await api.patch('/users/me/password', values);
      password.reset();
      toast.success('Нууц үг солигдлоо', 'Бусад төхөөрөмж дээрх сесс хаагдсан.');
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Алдаа гарлаа';
      password.setError('currentPassword', { message });
      toast.danger('Нууц үг солигдсонгүй', message);
    }
  }

  return (
    <div className="flex max-w-[760px] flex-col gap-6">
      <Card className="flex flex-wrap items-center gap-5 p-6">
        <Avatar size="lg" initials={initials(user.firstName, user.lastName)} src={user.avatarUrl} />
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="text-h3">{user.lastName.charAt(0)}. {user.firstName}</h2>
          <p className="text-body-sm text-text-secondary">{ROLE_LABELS[user.role]} · {user.email}</p>
          <p className="text-caption text-text-muted">Сүүлд нэвтэрсэн: {formatDate(user.lastLoginAt, true)}</p>
        </div>
      </Card>

      <Card className="p-6 md:p-8">
        <h3 className="text-h4">Хувийн мэдээлэл</h3>
        <form onSubmit={profile.handleSubmit(saveProfile)} noValidate className="mt-6 flex flex-col gap-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Input label="Овог" autoComplete="family-name" required error={profile.formState.errors.lastName?.message} {...profile.register('lastName')} />
            <Input label="Нэр" autoComplete="given-name" required error={profile.formState.errors.firstName?.message} {...profile.register('firstName')} />
          </div>
          <Input label="Утасны дугаар" placeholder="9911-2233" inputMode="tel" autoComplete="tel" helper="8 оронтой дугаар" error={profile.formState.errors.phone?.message} {...profile.register('phone')} />
          <Input label="И-мэйл" value={user.email} disabled helper="И-мэйл хаягийг өөрчлөхийн тулд админтай холбогдоно уу" readOnly />
          <div><Button type="submit" size="md" disabled={profile.formState.isSubmitting}>Хадгалах</Button></div>
        </form>
      </Card>

      <Card className="p-6 md:p-8">
        <h3 className="text-h4">Нууц үг солих</h3>
        <form onSubmit={password.handleSubmit(changePassword)} noValidate className="mt-6 flex flex-col gap-5">
          <Input label="Одоогийн нууц үг" type="password" autoComplete="current-password" required error={password.formState.errors.currentPassword?.message} {...password.register('currentPassword')} />
          <Input label="Шинэ нууц үг" type="password" autoComplete="new-password" required helper="Дор хаяж 8 тэмдэгт, үсэг ба тоо" error={password.formState.errors.newPassword?.message} {...password.register('newPassword')} />
          <div><Button type="submit" size="md" variant="secondary" disabled={password.formState.isSubmitting}>Нууц үг солих</Button></div>
        </form>
      </Card>
    </div>
  );
}
