// Figma: 02 Client Portal / Portal / 11b Error & Empty States / Desktop (34:913 — "Алдаа гарлаа", "Сүлжээний холбоо тасарлаа")
// + 11 Empty & Error / Mobile (37:1391)
'use client';

import { useEffect, useState } from 'react';
import { ErrorState } from '@/components/ui/states';
import { formatPhone } from '@/lib/format';
import { useFirmSettings } from '@/lib/settings';

export default function PortalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
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
    return <ErrorState title="Сүлжээний холбоо тасарлаа" message="Интернэт холболтоо шалгана уу. Холболт сэргэмэгц дахин оролдоно уу." onRetry={reset} />;
  }
  const support = firm.data ? ` Асуудал давтагдвал ${formatPhone(firm.data.phone)} дугаарт хандана уу.` : '';
  return (
    <ErrorState
      title="Алдаа гарлаа"
      message={error.message || `Мэдээллийг ачаалах явцад алдаа гарлаа. Түр хүлээгээд дахин оролдоно уу.${support}`}
      onRetry={reset}
    />
  );
}
