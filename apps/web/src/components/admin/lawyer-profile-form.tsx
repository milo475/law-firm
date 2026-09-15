'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { CreateLawyerProfileSchema } from '@law-firm/shared/schemas';
import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';
import { ApiError, api } from '@/lib/api';
import type { LawyerProfileRecord } from '@/lib/admin';

// Shared profile schema; specializations are typed as one comma-separated field and numbers come from inputs.
const ProfileFormSchema = z.object({
  title: CreateLawyerProfileSchema.shape.title,
  bio: CreateLawyerProfileSchema.shape.bio,
  education: CreateLawyerProfileSchema.shape.education,
  specializations: z.string().max(2000, 'Хэт урт байна'),
  yearsOfExperience: z.coerce.number({ message: 'Туршлага тоо байх ёстой' }).int('Бүхэл тоо оруулна уу').min(0, 'Сөрөг тоо байж болохгүй').max(80, 'Туршлага 80 жилээс хэтрэхгүй'),
  sortOrder: z.coerce.number({ message: 'Эрэмбэ тоо байх ёстой' }).int('Бүхэл тоо оруулна уу').min(0).max(1000),
  isPublic: z.boolean(),
});
type ProfileFormInput = z.input<typeof ProfileFormSchema>;
type ProfileFormValues = z.output<typeof ProfileFormSchema>;

const toDefaults = (profile: LawyerProfileRecord | null): ProfileFormInput => ({
  title: profile?.title ?? '',
  bio: profile?.bio ?? '',
  education: profile?.education ?? '',
  specializations: profile?.specializations.join(', ') ?? '',
  yearsOfExperience: profile?.yearsOfExperience ?? 0,
  sortOrder: profile?.sortOrder ?? 0,
  isPublic: profile?.isPublic ?? true,
});

/** Public-site lawyer profile (POST when missing, PATCH otherwise). Used by /admin/lawyers/[id] and /admin/profile. */
export function LawyerProfileForm({ userId, profile, showSortOrder, onSaved }: {
  userId: string;
  profile: LawyerProfileRecord | null;
  /** Ordering on the public team page is an admin concern. */
  showSortOrder?: boolean;
  onSaved: () => void | Promise<void>;
}) {
  const { register, control, handleSubmit, reset, formState: { errors, isDirty } } = useForm<ProfileFormInput, unknown, ProfileFormValues>({
    resolver: zodResolver(ProfileFormSchema),
    defaultValues: toDefaults(profile),
  });

  useEffect(() => reset(toDefaults(profile)), [profile, reset]);

  const save = useMutation({
    mutationFn: (values: ProfileFormValues) => {
      const payload = {
        ...values,
        specializations: values.specializations.split(/[,\n]/).map((s) => s.trim()).filter((s) => s.length >= 2),
      };
      return profile ? api.patch(`/lawyers/${userId}/profile`, payload) : api.post(`/lawyers/${userId}/profile`, payload);
    },
    onSuccess: async () => {
      toast.success(profile ? 'Профайл шинэчлэгдлээ' : 'Профайл үүслээ', 'Нийтийн сайтын хуульчдын хуудсанд тусна.');
      await onSaved();
    },
    onError: (error) => toast.danger('Профайл хадгалж чадсангүй', error instanceof ApiError ? error.message : undefined),
  });

  return (
    <Card className="p-6 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-h4">Нийтийн профайл</h3>
          <p className="mt-1 text-body-sm text-text-secondary">«Хуульчид» хуудсанд харагдах мэдээлэл.</p>
        </div>
        {profile?.isPublic && (
          <Button asChild variant="ghost" size="sm"><Link href={`/lawyers/${profile.id}`} target="_blank">Сайтад харах ↗</Link></Button>
        )}
      </div>
      {!profile && <p className="mt-4 rounded-md bg-bg-accent-soft px-4 py-3 text-body-sm text-text-accent">Профайл үүсгээгүй байна. Бөглөж хадгалснаар нийтийн сайтад гарна.</p>}
      <form onSubmit={handleSubmit((values) => save.mutate(values))} noValidate className="mt-6 flex flex-col gap-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <Input label="Албан тушаал" placeholder="Ахлах хуульч, өмгөөлөгч" required error={errors.title?.message} {...register('title')} />
          <Input label="Туршлага (жил)" type="number" min={0} max={80} required error={errors.yearsOfExperience?.message} {...register('yearsOfExperience')} />
        </div>
        <Input label="Мэргэшлийн чиглэл" placeholder="Иргэний эрх зүй, Хөдөлмөрийн эрх зүй" helper="Таслалаар тусгаарлана" error={errors.specializations?.message} {...register('specializations')} />
        <Textarea label="Танилцуулга" rows={5} required error={errors.bio?.message} {...register('bio')} />
        <Textarea label="Боловсрол" rows={3} required error={errors.education?.message} {...register('education')} />
        <div className="flex flex-wrap items-end gap-6">
          <Controller control={control} name="isPublic" render={({ field }) => (
            <Checkbox label="Нийтийн сайтад харуулах" checked={field.value} onCheckedChange={(v) => field.onChange(v === true)} />
          )} />
          {showSortOrder && <Input wrapperClassName="w-[160px]" label="Эрэмбэ" type="number" min={0} helper="Бага нь эхэнд" error={errors.sortOrder?.message} {...register('sortOrder')} />}
        </div>
        <div>
          <Button type="submit" size="md" disabled={save.isPending || (Boolean(profile) && !isDirty)}>{save.isPending ? 'Хадгалж байна…' : profile ? 'Профайл хадгалах' : 'Профайл үүсгэх'}</Button>
        </div>
      </form>
    </Card>
  );
}
