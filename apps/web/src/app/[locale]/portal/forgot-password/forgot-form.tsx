'use client';

import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toast';
import type { Locale } from '@/i18n/routing';
import { api } from '@/lib/api';
import { useApiError } from '@/lib/api-error';
import { formatPhone } from '@/lib/format';
import { useFirmSettings } from '@/lib/settings';

/**
 * Asks for a reset link. Whether or not the address belongs to an account, the page says the same
 * thing — the API answers the same way too, so this form cannot be used to find out who is a client.
 */
export function ForgotPasswordForm() {
  const t = useTranslations('portal.forgotPassword');
  const locale = useLocale() as Locale;
  const apiError = useApiError();
  const [identifier, setIdentifier] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const firm = useFirmSettings();
  const phone = firm.data ? formatPhone(firm.data.phone) : null;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      await api.post('/auth/forgot-password', { identifier: identifier.trim(), locale });
      setSent(true);
      toast.success(t('sentTitle'), phone ? t('sentWithPhone', { phone }) : t('sent'));
    } catch (error) {
      toast.danger(t('failed'), apiError(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5 md:gap-6">
      <Input
        label={t('identifier')}
        placeholder="batbayar@example.mn"
        autoComplete="username"
        required
        helper={t('identifierHelper')}
        value={identifier}
        onChange={(e) => setIdentifier(e.target.value)}
      />
      <Button type="submit" size="lg" className="w-full" disabled={busy}>
        {t('submit')}
      </Button>
      {/* Figma "Info" 28:258 — status-new tint */}
      <div className="flex flex-col gap-2 rounded-md bg-status-new-bg px-5 py-4 text-body-sm" role="status">
        <p className="text-body-sm-medium text-status-new-fg">{sent ? t('sentTitle') : t('linkValidity')}</p>
        <p className="text-text-secondary">
          {sent
            ? phone ? t('sentWithPhone', { phone }) : t('sent')
            : phone ? t('checkSpamWithPhone', { phone }) : t('checkSpam')}
        </p>
      </div>
    </form>
  );
}
