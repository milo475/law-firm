'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { LoginSchema, type LoginInput } from '@law-firm/shared/schemas';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/toast';
import { ApiError, api } from '@/lib/api';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema),
    defaultValues: { identifier: '', password: '' },
  });

  async function onSubmit(values: LoginInput) {
    try {
      await api.post('/auth/login', values);
      const next = searchParams.get('next');
      router.replace(next && next.startsWith('/portal') ? next : '/portal');
      router.refresh();
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Нэвтрэхэд алдаа гарлаа';
      setError('password', { message });
      toast.danger('Нэвтэрч чадсангүй', message);
    }
  }

  return (
    <Tabs defaultValue="password">
      <TabsList>
        <TabsTrigger value="password">Нууц үг</TabsTrigger>
        <TabsTrigger value="otp">Нэг удаагийн код</TabsTrigger>
      </TabsList>
      <TabsContent value="password">
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
          <Input label="И-мэйл эсвэл утас" placeholder="name@example.mn эсвэл 9911-2233" autoComplete="username" required error={errors.identifier?.message} {...register('identifier')} />
          <Input label="Нууц үг" type="password" placeholder="••••••••" autoComplete="current-password" required error={errors.password?.message} {...register('password')} />
          <div className="flex items-center justify-between">
            <Link href="/portal/forgot-password" className="focus-ring rounded-sm text-body-sm text-text-accent hover:underline">Нууц үгээ мартсан?</Link>
          </div>
          <Button type="submit" size="md" disabled={isSubmitting}>{isSubmitting ? 'Нэвтэрч байна…' : 'Нэвтрэх'}</Button>
        </form>
      </TabsContent>
      <TabsContent value="otp">
        <div className="flex flex-col gap-5">
          <div className="rounded-md bg-bg-accent-soft px-4 py-3 text-body-sm text-text-accent" role="status">Нэг удаагийн кодоор нэвтрэх боломж тун удахгүй нээгдэнэ.</div>
          <Input label="Утасны дугаар" placeholder="9911-2233" disabled helper="Кодыг SMS-ээр илгээнэ" />
          <Input label="Баталгаажуулах код" placeholder="6 оронтой код" disabled />
          <Button type="button" size="md" disabled>Тун удахгүй</Button>
        </div>
      </TabsContent>
    </Tabs>
  );
}
