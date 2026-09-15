import Link from 'next/link';
import { Skeleton } from '@/components/ui/states';
import { cn } from '@/lib/utils';

/** Dashboard counter card (same card tokens as the portal dashboard stats). */
export function StatTile({ label, value, hint, href, tone }: { label: string; value: string | null; hint?: string; href?: string; tone?: 'danger' | 'accent' }) {
  const body = (
    <>
      <span className="text-body-sm text-text-secondary">{label}</span>
      {value === null ? (
        <Skeleton className="h-9 w-24" />
      ) : (
        <span className={cn('font-serif text-h3', tone === 'danger' ? 'text-status-danger-fg' : tone === 'accent' ? 'text-text-accent' : 'text-text-brand')}>{value}</span>
      )}
      {hint && <span className="text-caption text-text-muted">{hint}</span>}
    </>
  );
  const className = 'flex flex-col gap-2 rounded-lg border border-border-default bg-bg-surface p-5 transition-colors';
  return href ? (
    <Link href={href} className={cn(className, 'focus-ring hover:border-border-strong')}>{body}</Link>
  ) : (
    <div className={className}>{body}</div>
  );
}
