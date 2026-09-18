'use client';

import { useTranslations } from 'next-intl';
import { ErrorState } from '@/components/ui/states';

export default function SiteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations('states');
  return (
    <div className="mx-auto max-w-[720px] px-4 py-16 md:px-6">
      <ErrorState title={t('pageTitle')} message={error.message || t('pageMessage')} onRetry={reset} />
    </div>
  );
}
