// Figma: 02 Client Portal / Portal / 11b Error & Empty States / Desktop (34:913 — "Алдаа гарлаа", "Сүлжээний холбоо тасарлаа")
// + 11 Empty & Error / Mobile (37:1391)
'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { ErrorState } from '@/components/ui/states';
import { formatPhone } from '@/lib/format';
import { useFirmSettings } from '@/lib/settings';

export default function PortalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations('portal.error');
  // Figma's offline variant — shown when the browser reports no connection
  const [offline, setOffline] = useState(false);
  const firm = useFirmSettings();
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);

  if (offline) {
    return <ErrorState title={t('offlineTitle')} message={t('offlineMessage')} onRetry={reset} />;
  }
  const support = firm.data ? ` ${t('support', { phone: formatPhone(firm.data.phone) })}` : '';
  return (
    <ErrorState
      title={t('title')}
      message={error.message || `${t('message')}${support}`}
      onRetry={reset}
    />
  );
}
