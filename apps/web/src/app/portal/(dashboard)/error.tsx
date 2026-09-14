'use client';

import { ErrorState } from '@/components/ui/states';

export default function PortalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorState title="Хуудас ачаалахад алдаа гарлаа" message={error.message || 'Түр зуурын алдаа. Дахин оролдоно уу.'} onRetry={reset} />;
}
