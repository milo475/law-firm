// Figma: 01 Public Site / Public / 10 Contact / Desktop (22:843, "Form") + Mobile (26:1538, "Form")
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ContactRequestSchema, type ContactRequestInput } from '@law-firm/shared/schemas';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';
import { SERVICES } from '@/content/services';
import { ApiError, api } from '@/lib/api';
import { useState } from 'react';

const SUBJECTS = SERVICES.map((s) => ({ value: s.title, label: s.title })).concat({ value: 'Бусад', label: 'Бусад' });

export function ContactForm() {
  const [agreed, setAgreed] = useState(false);
  const { register, handleSubmit, setValue, watch, reset, formState: { errors, isSubmitting } } = useForm<ContactRequestInput>({
    resolver: zodResolver(ContactRequestSchema),
    defaultValues: { name: '', phone: '', email: undefined, subject: '', message: '' },
  });
  const subject = watch('subject');

  async function onSubmit(values: ContactRequestInput) {
    const payload = { ...values, email: values.email?.trim() ? values.email.trim() : undefined };
    try {
      const result = await api.post<{ message: string }>('/contact', payload);
      toast.success('Хүсэлт илгээгдлээ', result.message);
      reset();
      setAgreed(false);
    } catch (error) {
      if (error instanceof ApiError && error.status === 429) {
        toast.warning('Хэт олон хүсэлт', 'Нэг цагийн дотор 5-аас олон хүсэлт илгээх боломжгүй. Түр хүлээгээд дахин оролдоно уу.');
      } else {
        toast.danger('Илгээхэд алдаа гарлаа', error instanceof ApiError ? error.message : 'Дахин оролдоно уу.');
      }
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5 md:gap-6">
      {/* Row — name + phone side by side on desktop (gap 20), stacked on mobile */}
      <div className="grid gap-5 md:grid-cols-2">
        <Input label="Таны нэр" placeholder="Ж. Батсайхан" autoComplete="name" required helper="Овог нэрээ бүтнээр бичнэ үү" error={errors.name?.message} {...register('name')} />
        <Input label="Утасны дугаар" placeholder="9911-2233" inputMode="tel" autoComplete="tel" required helper="8 оронтой дугаар" error={errors.phone?.message} {...register('phone')} />
      </div>
      <Input label="Имэйл хаяг" placeholder="batsaikhan@example.mn" type="email" autoComplete="email" helper="Хариуг энэ хаягаар илгээнэ" error={errors.email?.message} {...register('email', { setValueAs: (v: string) => (v?.trim() ? v.trim() : undefined) })} />
      <Select
        label="Асуудлын төрөл"
        placeholder="Асуудлын төрлөө сонгоно уу"
        options={SUBJECTS}
        value={subject || undefined}
        onValueChange={(v) => setValue('subject', v, { shouldValidate: true })}
        helper="Хамгийн тохирох чиглэлээ сонгоно уу"
        error={errors.subject?.message}
        required
      />
      <Textarea label="Асуудлын тайлбар" placeholder="Асуудлаа товч тайлбарлана уу..." rows={4} maxLength={1000} required helper="Дээд тал нь 1000 тэмдэгт" error={errors.message?.message} {...register('message')} />
      <Checkbox
        label={
          <>
            Нууцлалын бодлоготой танилцсан
            <span className="hidden md:inline">, мэдээллээ боловсруулахыг зөвшөөрч байна</span>
          </>
        }
        checked={agreed}
        onCheckedChange={(v) => setAgreed(v === true)}
      />
      <Button type="submit" size="lg" className="w-full" disabled={isSubmitting || !agreed}>
        {isSubmitting ? 'Илгээж байна…' : 'Хүсэлт илгээх'}
      </Button>
    </form>
  );
}
