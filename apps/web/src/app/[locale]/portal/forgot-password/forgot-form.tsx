'use client';

import { useTranslations } from 'next-intl';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toast';
import { formatPhone } from '@/lib/format';
import { useFirmSettings } from '@/lib/settings';

/** UI only — the password-reset API is not available yet. */
export function ForgotPasswordForm() {
  const t = useTranslations('portal.forgotPassword');
  const [identifier, setIdentifier] = useState('');
  const [sent, setSent] = useState(false);
  const firm = useFirmSettings();
  const phone = firm.data ? formatPhone(firm.data.phone) : null;

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSent(true);
    toast.info(t('soon'), phone ? t('soonToastWithPhone', { phone }) : t('soonToast'));
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
      <Button type="submit" size="lg" className="w-full">
        {t('submit')}
      </Button>
      {/* Figma "Info" 28:258 — status-new tint */}
      <div className="flex flex-col gap-2 rounded-md bg-status-new-bg px-5 py-4 text-body-sm" role="status">
        <p className="text-body-sm-medium text-status-new-fg">{sent ? t('soon') : t('linkValidity')}</p>
        <p className="text-text-secondary">
          {sent
            ? phone ? t('sentWithPhone', { phone }) : t('sent')
            : phone ? t('checkSpamWithPhone', { phone }) : t('checkSpam')}
        </p>
      </div>
    </form>
  );
}
