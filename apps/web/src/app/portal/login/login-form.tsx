'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { LoginSchema, type LoginInput } from '@law-firm/shared/schemas';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { AuthBackLink, AuthHeading, AuthSwitchLink } from '@/components/portal/auth-card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toast';
import { ApiError, api } from '@/lib/api';

const OTP_LENGTH = 6;

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<'password' | 'otp'>('password');
  const [remember, setRemember] = useState(false);
  const { register, handleSubmit, setError, getValues, formState: { errors, isSubmitting } } = useForm<LoginInput>({
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

  // Figma "Portal / 01b Login OTP" — UI only until the OTP API exists.
  if (mode === 'otp') {
    const identifier = getValues('identifier').trim();
    return (
      <>
        <AuthBackLink label="Буцах" onClick={() => setMode('password')} />
        <AuthHeading
          title="Баталгаажуулах код"
          description={`${identifier || 'Бүртгэлтэй утасны дугаар'}т илгээсэн ${OTP_LENGTH} оронтой кодыг оруулна уу.`}
        />
        <OtpDigits />
        <p className="text-body-sm text-text-muted" role="status">
          Нэг удаагийн кодоор нэвтрэх боломж тун удахгүй нээгдэнэ.
        </p>
        <Button type="button" size="lg" className="w-full" disabled>
          Тун удахгүй
        </Button>
        <Button type="button" variant="ghost" size="md" className="w-full" disabled>
          Кодыг дахин илгээх
        </Button>
      </>
    );
  }

  return (
    <>
      <AuthHeading title="Нэвтрэх" description="Утасны дугаар эсвэл имэйлээ оруулна уу." descriptionClassName="hidden md:block" />
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5 md:gap-6">
        <Input label="Утас эсвэл имэйл" placeholder="9911-2233" autoComplete="username" required error={errors.identifier?.message} {...register('identifier')} />
        <Input label="Нууц үг" type="password" placeholder="••••••••" autoComplete="current-password" required error={errors.password?.message} {...register('password')} />
        <div className="flex items-center justify-between gap-3">
          <Checkbox label="Намайг сана" checked={remember} onCheckedChange={(v) => setRemember(v === true)} />
          <Link href="/portal/forgot-password" className="focus-ring rounded-sm text-body-sm-medium text-text-accent hover:underline">
            Нууц үг мартсан?
          </Link>
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Нэвтэрч байна…' : 'Нэвтрэх'}
        </Button>
      </form>
      <div className="flex items-center gap-3" aria-hidden>
        <span className="h-px flex-1 bg-border-default" />
        <span className="text-caption text-text-muted">эсвэл</span>
        <span className="h-px flex-1 bg-border-default" />
      </div>
      <Button type="button" variant="secondary" size="lg" className="w-full" onClick={() => setMode('otp')}>
        Нэг удаагийн кодоор нэвтрэх
      </Button>
      <AuthSwitchLink prompt="Бүртгэлгүй юу?" href="/portal/register" label="Бүртгүүлэх" />
    </>
  );
}

/** Six 64px digit boxes (Figma "OTP" 28:130) — disabled until the OTP API ships. */
function OtpDigits() {
  return (
    <fieldset className="flex gap-3" disabled>
      <legend className="sr-only">Баталгаажуулах код</legend>
      {Array.from({ length: OTP_LENGTH }, (_, i) => (
        <input
          key={i}
          type="text"
          inputMode="numeric"
          maxLength={1}
          autoComplete="one-time-code"
          aria-label={`${i + 1}-р орон`}
          className="focus-ring h-16 w-full min-w-0 flex-1 rounded-md border border-border-default bg-bg-surface text-center font-serif text-[22px] font-semibold leading-[30px] text-text-primary disabled:cursor-not-allowed disabled:bg-bg-surface-alt disabled:text-text-disabled"
        />
      ))}
    </fieldset>
  );
}
