'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AdminCreateUserSchema, PhoneSchema } from '@law-firm/shared/schemas';
import { useMutation } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal, ModalContent } from '@/components/ui/modal';
import { toast } from '@/components/ui/toast';
import { ApiError, api } from '@/lib/api';

const EditUserFormSchema = z.object({
  lastName: AdminCreateUserSchema.shape.lastName,
  firstName: AdminCreateUserSchema.shape.firstName,
  email: AdminCreateUserSchema.shape.email,
  phone: z.union([PhoneSchema, z.literal('')]),
});
type EditUserFormValues = z.infer<typeof EditUserFormSchema>;

export interface EditableUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
}

/** ADMIN edits basic account data through PATCH /users/:id. */
export function EditUserModal({ open, onOpenChange, user, onSaved }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: EditableUser;
  onSaved: () => void | Promise<void>;
}) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<EditUserFormValues>({
    resolver: zodResolver(EditUserFormSchema),
    defaultValues: { lastName: user.lastName, firstName: user.firstName, email: user.email, phone: user.phone ?? '' },
  });

  useEffect(() => {
    if (open) reset({ lastName: user.lastName, firstName: user.firstName, email: user.email, phone: user.phone ?? '' });
  }, [open, user, reset]);

  const save = useMutation({
    mutationFn: (values: EditUserFormValues) => api.patch(`/users/${user.id}`, { ...values, phone: values.phone || null }),
    onSuccess: async () => {
      toast.success('Мэдээлэл шинэчлэгдлээ');
      await onSaved();
      onOpenChange(false);
    },
    onError: (error) => toast.danger('Хадгалж чадсангүй', error instanceof ApiError ? error.message : undefined),
  });

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent
        title="Мэдээлэл засах"
        footer={
          <>
            <Button variant="ghost" size="md" onClick={() => onOpenChange(false)} disabled={save.isPending}>Болих</Button>
            <Button size="md" type="submit" form="edit-user-form" disabled={save.isPending}>{save.isPending ? 'Хадгалж байна…' : 'Хадгалах'}</Button>
          </>
        }
      >
        <form id="edit-user-form" onSubmit={handleSubmit((values) => save.mutate(values))} noValidate className="flex flex-col gap-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Input label="Овог" required error={errors.lastName?.message} {...register('lastName')} />
            <Input label="Нэр" required error={errors.firstName?.message} {...register('firstName')} />
          </div>
          <Input label="И-мэйл" type="email" required error={errors.email?.message} {...register('email')} />
          <Input label="Утасны дугаар" inputMode="tel" error={errors.phone?.message} {...register('phone')} />
        </form>
      </ModalContent>
    </Modal>
  );
}
