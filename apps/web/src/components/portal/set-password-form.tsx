'use client';

import { PASSWORD_MIN_LENGTH, PasswordSchema } from '@law-firm/shared/schemas';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { CheckCircleIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toast';
import { Link } from '@/i18n/navigation';
import { api } from '@/lib/api';
import { useApiError } from '@/lib/api-error';

/**
 * The end of both one-time links: a reset and an invitation differ only in the wording and the
 * endpoint. The token travels in the query string and is never stored — it is spent on submit.
 */
export function SetPasswordForm({ mode }: { mode: 'reset' | 'invite' }) {
  const t = useTranslations(mode === 'reset' ? 'portal.resetPassword' : 'portal.acceptInvite');
  const tRegister = useTranslations('portal.register');
  const apiError = useApiError();
  const token = useSearchParams().get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) {
      setError(t('missingToken'));
      return;
    }
    const parsed = PasswordSchema.safeParse(password);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    if (password !== confirm) {
      setError(t('mismatch'));
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await api.post(mode === 'reset' ? '/auth/reset-password' : '/auth/accept-invite', { token, password });
      setDone(true);
      toast.success(t('doneTitle'), t('doneBody'));
    } catch (failure) {
      const message = apiError(failure);
      setError(message);
      toast.danger(t('failed'), message);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="flex flex-col gap-5">
        <div className="flex items-start gap-3 rounded-md bg-status-progress-bg px-5 py-4" role="status">
          <CheckCircleIcon className="mt-0.5 size-5 shrink-0 text-status-progress-fg" />
          <div className="flex min-w-0 flex-col gap-1">
            <p className="text-body-sm-medium text-status-progress-fg">{t('doneTitle')}</p>
            <p className="text-body-sm text-text-secondary">{t('doneBody')}</p>
          </div>
        </div>
        <Button asChild size="lg" className="w-full">
          <Link href="/portal/login">{t('toLogin')}</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5 md:gap-6">
      <Input
        label={t('password')}
        type="password"
        autoComplete="new-password"
        required
        helper={tRegister('passwordHelper', { min: PASSWORD_MIN_LENGTH })}
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />
      <Input
        label={t('confirm')}
        type="password"
        autoComplete="new-password"
        required
        error={error ?? undefined}
        value={confirm}
        onChange={(event) => setConfirm(event.target.value)}
      />
      <Button type="submit" size="lg" className="w-full" disabled={busy}>
        {busy ? t('submitting') : t('submit')}
      </Button>
    </form>
  );
}
