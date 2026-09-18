'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { LoginSchema, type LoginInput } from '@law-firm/shared/schemas';
import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { AuthBackLink, AuthHeading, AuthSwitchLink } from '@/components/portal/auth-card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toast';
import { Link } from '@/i18n/navigation';
import { ApiError, api } from '@/lib/api';

const OTP_LENGTH = 6;

export function LoginForm() {
  const t = useTranslations('portal.login');
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
      const { user } = await api.post<{ user: { role: string } }>('/auth/login', values);
      const next = searchParams.get('next');
      const isStaff = user.role === 'ADMIN' || user.role === 'LAWYER';
      const safeNext = next && (next.startsWith('/portal') || (isStaff && next.startsWith('/admin'))) ? next : null;
      router.replace(safeNext ?? (isStaff ? '/admin' : '/portal'));
      router.refresh();
    } catch (error) {
      const message = error instanceof ApiError ? error.message : t('genericError');
      setError('password', { message });
      toast.danger(t('failedToast'), message);
    }
  }

  // Figma "Portal / 01b Login OTP" — UI only until the OTP API exists.
  if (mode === 'otp') {
    const identifier = getValues('identifier').trim();
    return (
      <>
        <AuthBackLink label={t('back')} onClick={() => setMode('password')} />
        <AuthHeading
          title={t('otpTitle')}
          description={t('otpDescription', { identifier: identifier || t('otpFallbackIdentifier'), length: OTP_LENGTH })}
        />
        <OtpDigits legend={t('otpTitle')} digitLabel={(index) => t('otpDigit', { index })} />
        <p className="text-body-sm text-text-muted" role="status">
          {t('otpSoonNote')}
        </p>
        <Button type="button" size="lg" className="w-full" disabled>
          {t('otpSoon')}
        </Button>
        <Button type="button" variant="ghost" size="md" className="w-full" disabled>
          {t('otpResend')}
        </Button>
      </>
    );
  }

  return (
    <>
      <AuthHeading title={t('title')} description={t('description')} descriptionClassName="hidden md:block" />
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5 md:gap-6">
        <Input label={t('identifier')} placeholder="9911-2233" autoComplete="username" required error={errors.identifier?.message} {...register('identifier')} />
        <Input label={t('password')} type="password" placeholder="••••••••" autoComplete="current-password" required error={errors.password?.message} {...register('password')} />
        <div className="flex items-center justify-between gap-3">
          <Checkbox label={t('remember')} checked={remember} onCheckedChange={(v) => setRemember(v === true)} />
          <Link href="/portal/forgot-password" className="focus-ring rounded-sm text-body-sm-medium text-text-accent hover:underline">
            {t('forgot')}
          </Link>
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? t('submitting') : t('submit')}
        </Button>
      </form>
      <div className="flex items-center gap-3" aria-hidden>
        <span className="h-px flex-1 bg-border-default" />
        <span className="text-caption text-text-muted">{t('or')}</span>
        <span className="h-px flex-1 bg-border-default" />
      </div>
      <Button type="button" variant="secondary" size="lg" className="w-full" onClick={() => setMode('otp')}>
        {t('otpCta')}
      </Button>
      <AuthSwitchLink prompt={t('noAccount')} href="/portal/register" label={t('registerCta')} />
    </>
  );
}

/** Six 64px digit boxes (Figma "OTP" 28:130) — disabled until the OTP API ships. */
function OtpDigits({ legend, digitLabel }: { legend: string; digitLabel: (index: number) => string }) {
  return (
    <fieldset className="flex gap-3" disabled>
      <legend className="sr-only">{legend}</legend>
      {Array.from({ length: OTP_LENGTH }, (_, i) => (
        <input
          key={i}
          type="text"
          inputMode="numeric"
          maxLength={1}
          autoComplete="one-time-code"
          aria-label={digitLabel(i + 1)}
          className="focus-ring h-16 w-full min-w-0 flex-1 rounded-md border border-border-default bg-bg-surface text-center font-serif text-[22px] font-semibold leading-[30px] text-text-primary disabled:cursor-not-allowed disabled:bg-bg-surface-alt disabled:text-text-disabled"
        />
      ))}
    </fieldset>
  );
}
