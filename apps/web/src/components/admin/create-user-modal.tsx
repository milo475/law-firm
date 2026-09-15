'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AdminCreateUserSchema, PasswordSchema, PhoneSchema } from '@law-firm/shared/schemas';
import { useMutation } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal, ModalContent } from '@/components/ui/modal';
import { toast } from '@/components/ui/toast';
import { ApiError, api } from '@/lib/api';
import type { AdminUser } from '@/lib/admin';
import { shortName } from '@/lib/utils';

const CreateUserFormSchema = AdminCreateUserSchema.omit({ role: true, isActive: true }).extend({
  phone: z.union([PhoneSchema, z.literal('')]),
  password: z.union([PasswordSchema, z.literal('')]),
});
type CreateUserFormValues = z.infer<typeof CreateUserFormSchema>;

const EMPTY: CreateUserFormValues = { email: '', firstName: '', lastName: '', phone: '', password: '' };

/** ADMIN creates a CLIENT or LAWYER. If no password is typed the API returns a one-time temporary password. */
export function CreateUserModal({ open, onOpenChange, role, onCreated }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: 'CLIENT' | 'LAWYER';
  onCreated?: (user: AdminUser) => void;
}) {
  const [result, setResult] = useState<{ user: AdminUser; temporaryPassword: string | null } | null>(null);
  const form = useForm<CreateUserFormValues>({ resolver: zodResolver(CreateUserFormSchema), defaultValues: EMPTY });
  const { register, handleSubmit, reset, formState: { errors } } = form;
  const noun = role === 'LAWYER' ? 'хуульч' : 'харилцагч';

  useEffect(() => {
    if (open) {
      reset(EMPTY);
      setResult(null);
    }
  }, [open, reset]);

  const create = useMutation({
    mutationFn: (values: CreateUserFormValues) =>
      api.post<{ user: AdminUser; temporaryPassword: string | null }>('/users', {
        email: values.email,
        firstName: values.firstName,
        lastName: values.lastName,
        role,
        ...(values.phone ? { phone: values.phone } : {}),
        ...(values.password ? { password: values.password } : {}),
      }),
    onSuccess: (data) => {
      setResult(data);
      toast.success(`Шинэ ${noun} бүртгэгдлээ`, shortName(data.user.firstName, data.user.lastName));
      onCreated?.(data.user);
    },
    onError: (error) => toast.danger('Бүртгэж чадсангүй', error instanceof ApiError ? error.message : undefined),
  });

  async function copyPassword(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast.info('Хуулагдлаа', 'Түр нууц үгийг хэрэглэгчид аюулгүй сувгаар дамжуулна уу.');
    } catch {
      toast.warning('Хуулж чадсангүй', 'Нууц үгийг гараар тэмдэглэнэ үү.');
    }
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent
        title={result ? `${role === 'LAWYER' ? 'Хуульч' : 'Харилцагч'} бүртгэгдлээ` : `Шинэ ${noun}`}
        description={result ? undefined : role === 'LAWYER' ? 'Хуульч бүртгэсний дараа нийтийн сайтад харагдах профайлыг бөглөнө.' : 'Харилцагч порталд нэвтэрч хэргийн явцаа харах боломжтой болно.'}
        footer={
          result ? (
            <Button size="md" onClick={() => onOpenChange(false)}>Хаах</Button>
          ) : (
            <>
              <Button variant="ghost" size="md" onClick={() => onOpenChange(false)} disabled={create.isPending}>Болих</Button>
              <Button size="md" type="submit" form="create-user-form" disabled={create.isPending}>{create.isPending ? 'Бүртгэж байна…' : 'Бүртгэх'}</Button>
            </>
          )
        }
      >
        {result ? (
          <div className="flex flex-col gap-4">
            <p className="text-body text-text-secondary">
              {shortName(result.user.firstName, result.user.lastName)} ({result.user.email}) амжилттай бүртгэгдлээ.
            </p>
            {result.temporaryPassword ? (
              <div className="flex flex-col gap-3 rounded-md border border-border-default bg-bg-accent-soft p-4">
                <p className="text-body-sm-medium text-text-primary">Түр нууц үг</p>
                <div className="flex flex-wrap items-center gap-3">
                  <code className="rounded-sm bg-bg-surface px-3 py-2 font-mono text-body-medium tracking-wider text-text-brand">{result.temporaryPassword}</code>
                  <Button variant="secondary" size="sm" onClick={() => void copyPassword(result.temporaryPassword!)}>Хуулах</Button>
                </div>
                <p className="text-caption text-text-accent">Энэ нууц үг зөвхөн одоо харагдана. Хэрэглэгч анх нэвтэрсний дараа профайлаасаа сольно.</p>
              </div>
            ) : (
              <p className="text-body-sm text-text-secondary">Таны оруулсан нууц үгээр нэвтэрнэ.</p>
            )}
          </div>
        ) : (
          <form id="create-user-form" onSubmit={handleSubmit((values) => create.mutate(values))} noValidate className="flex flex-col gap-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <Input label="Овог" autoComplete="off" required error={errors.lastName?.message} {...register('lastName')} />
              <Input label="Нэр" autoComplete="off" required error={errors.firstName?.message} {...register('firstName')} />
            </div>
            <Input label="И-мэйл" type="email" autoComplete="off" required error={errors.email?.message} {...register('email')} />
            <Input label="Утасны дугаар" inputMode="tel" placeholder="99112233" helper="Заавал биш" error={errors.phone?.message} {...register('phone')} />
            <Input label="Нууц үг" type="password" autoComplete="new-password" helper="Хоосон орхивол түр нууц үг автоматаар үүснэ" error={errors.password?.message} {...register('password')} />
          </form>
        )}
      </ModalContent>
    </Modal>
  );
}
