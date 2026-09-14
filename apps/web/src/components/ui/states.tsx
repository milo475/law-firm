// Figma: Design System — EmptyState / ErrorState / loading skeletons
import { cn } from '@/lib/utils';
import { Button } from './button';

export function EmptyState({ title, description, action, icon, className }: { title: string; description?: string; action?: React.ReactNode; icon?: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border-default bg-bg-surface px-6 py-12 text-center', className)}>
      {icon && <span className="flex size-14 items-center justify-center rounded-full bg-bg-brand-soft text-text-brand">{icon}</span>}
      <p className="text-body-medium text-text-primary">{title}</p>
      {description && <p className="max-w-md text-body-sm text-text-secondary">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function ErrorState({ title = 'Алдаа гарлаа', message, onRetry, className }: { title?: string; message?: string; onRetry?: () => void; className?: string }) {
  return (
    <div role="alert" className={cn('flex flex-col items-start gap-3 rounded-lg border border-status-danger-solid/40 bg-status-danger-bg px-6 py-5', className)}>
      <p className="text-body-medium text-status-danger-fg">{title}</p>
      {message && <p className="text-body-sm text-text-secondary">{message}</p>}
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>Дахин оролдох</Button>
      )}
    </div>
  );
}

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div aria-hidden className={cn('animate-pulse rounded-md bg-bg-surface-alt', className)} {...props} />;
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border-default bg-bg-surface" aria-busy aria-label="Ачааллаж байна">
      <div className="h-14 bg-bg-surface-alt" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex h-14 items-center gap-6 border-b border-border-default px-6 last:border-b-0">
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

