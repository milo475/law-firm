'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { RegisterSchema, type RegisterInput } from '@law-firm/shared/schemas';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toast';
import { ApiError, api } from '@/lib/api';

export function RegisterForm() {
  const router = useRouter();
  const [agreed, setAgreed] = useState(false);
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<RegisterInput>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: { email: '', phone: undefined, password: '', firstName: '', lastName: '' },
  });

  async function onSubmit(values: RegisterInput) {
    try {
      await api.post('/auth/register', { ...values, phone: values.phone?.trim() ? values.phone.trim() : undefined });
      toast.success('Бүртгэл амжилттай', 'Порталд тавтай морил.');
      router.replace('/portal');
      router.refresh();
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Бүртгүүлэхэд алдаа гарлаа';
      if (error instanceof ApiError && error.status === 409) setError('email', { message });
      toast.danger('Бүртгүүлж чадсангүй', message);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Input label="Овог" autoComplete="family-name" required error={errors.lastName?.message} {...register('lastName')} />
        <Input label="Нэр" autoComplete="given-name" required error={errors.firstName?.message} {...register('firstName')} />
      </div>
      <Input label="И-мэйл" type="email" autoComplete="email" required error={errors.email?.message} {...register('email')} />
      <Input label="Утасны дугаар" placeholder="9911-2233" inputMode="tel" autoComplete="tel" helper="Заавал биш" error={errors.phone?.message} {...register('phone', { setValueAs: (v: string) => (v?.trim() ? v.trim() : undefined) })} />
      <Input label="Нууц үг" type="password" autoComplete="new-password" required helper="Дор хаяж 8 тэмдэгт, үсэг ба тоо" error={errors.password?.message} {...register('password')} />
      <Checkbox label="Үйлчилгээний нөхцөлтэй танилцсан" checked={agreed} onCheckedChange={(v) => setAgreed(v === true)} />
      <Button type="submit" size="md" disabled={isSubmitting || !agreed}>{isSubmitting ? 'Бүртгэж байна…' : 'Бүртгүүлэх'}</Button>
    </form>
  );
}
