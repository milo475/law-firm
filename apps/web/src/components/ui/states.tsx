// Figma: 02 Client Portal / Portal / 11 Empty State / Desktop (34:830), 11b Error & Empty States / Desktop (34:913),
// 11 Empty & Error / Mobile (37:1391) — "Бүх төлөв нэг загвартай: дүрс, тодорхой гарчиг, тайлбар, үйлдлийн товч."
import Link from 'next/link';
import { EmptyCasesGlyph, ErrorStateGlyph } from '@/components/icons';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { Button } from './button';

// State card: surface + border-default + radius-lg; 40/20px padding & 16px gap on mobile, 64/40px & 20px on desktop.
const stateCard = 'flex w-full flex-col items-center gap-4 rounded-lg border border-border-default bg-bg-surface px-5 py-10 text-center md:gap-5 md:px-10 md:py-16';
// Illustration disc: 96px mobile / 112px desktop. Tint follows the glyph's `data-tone` (defaults to info/new).
const disc = cn(
  'flex size-24 shrink-0 items-center justify-center rounded-full bg-status-new-bg text-status-new-fg md:size-28',
  'has-[[data-tone=pending]]:bg-status-pending-bg has-[[data-tone=pending]]:text-status-pending-fg',
  'has-[[data-tone=closed]]:bg-status-closed-bg has-[[data-tone=closed]]:text-status-closed-fg',
  'has-[[data-tone=danger]]:bg-status-danger-bg has-[[data-tone=danger]]:text-status-danger-fg',
);
// Title: Mobile/H3 (serif 20/28) → Heading/H3 (28/36)
const title = 'font-serif text-[20px] font-semibold leading-7 text-text-primary md:text-h3';
// Description: Body/Small → Body/Base, text-secondary, 460px measure
const description = 'max-w-[460px] text-body-sm text-text-secondary md:text-body';
// Buttons: full-width stack (10px gap) on mobile, inline row (12px gap) from sm
const actions = 'flex w-full flex-col gap-2.5 pt-1 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-center sm:gap-3 md:pt-2 [&>*]:w-full sm:[&>*]:w-auto';

export function EmptyState({ title: heading, description: text, action, icon, className }: { title: string; description?: string; action?: React.ReactNode; icon?: React.ReactNode; className?: string }) {
  return (
    <div className={cn(stateCard, className)}>
      <span className={disc} aria-hidden>{icon ?? <EmptyCasesGlyph />}</span>
      <p className={title}>{heading}</p>
      {text && <p className={description}>{text}</p>}
      {action && <div className={actions}>{action}</div>}
    </div>
  );
}

export function ErrorState({ title: heading, message, onRetry, className }: { title?: string; message?: string; onRetry?: () => void; className?: string }) {
  const t = useTranslations('states');
  return (
    <div role="alert" className={cn(stateCard, className)}>
      <span className={cn(disc, 'bg-status-danger-bg text-status-danger-fg')} aria-hidden><ErrorStateGlyph /></span>
      <p className={title}>{heading ?? t('errorTitle')}</p>
      <p className={description}>{message || t('errorMessage')}</p>
      <div className={actions}>
        {onRetry && <Button variant="primary" size="md" onClick={onRetry}>{t('retry')}</Button>}
        <Button asChild variant="secondary" size="md"><Link href="/contact">{t('getHelp')}</Link></Button>
      </div>
    </div>
  );
}

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div aria-hidden className={cn('animate-pulse rounded-md bg-bg-surface-alt', className)} {...props} />;
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  const t = useTranslations('states');
  return (
    <div className="overflow-hidden rounded-lg border border-border-default bg-bg-surface" aria-busy aria-label={t('loading')}>
      <div className="h-14 border-b border-border-default bg-bg-surface-alt" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex h-14 items-center gap-6 border-b border-border-subtle px-6 last:border-b-0">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-col gap-3 rounded-lg border border-border-default bg-bg-surface p-6', className)} aria-busy>
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}
