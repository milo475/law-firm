'use client';

import { ErrorState } from '@/components/ui/states';

export default function SiteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-[720px] px-4 py-16 md:px-6">
      <ErrorState title="Хуудас ачаалахад алдаа гарлаа" message={error.message || 'Түр зуурын алдаа. Дахин оролдоно уу.'} onRetry={reset} />
    </div>
  );
}
