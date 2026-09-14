// Figma: Design System / Table row (10:45) — State: Header / Default / Hover; 56px rows, 24px padding
import { cn } from '@/lib/utils';

export function Table({ className, ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto rounded-lg border border-border-default bg-bg-surface">
      <table className={cn('w-full min-w-[720px] border-collapse text-left', className)} {...props} />
    </div>
  );
}

export function TableHead({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn('bg-bg-surface-alt', className)} {...props} />;
}

export function TableBody({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={className} {...props} />;
}

export function TableRow({ className, interactive, ...props }: React.HTMLAttributes<HTMLTableRowElement> & { interactive?: boolean }) {
  return (
    <tr
      className={cn('h-14 border-b border-border-default last:border-b-0', interactive && 'transition-colors hover:bg-bg-brand-soft', className)}
      {...props}
    />
  );
}

export function TableHeaderCell({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return <th scope="col" className={cn('h-14 px-6 text-caption font-medium text-text-secondary whitespace-nowrap', className)} {...props} />;
}

export function TableCell({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn('h-14 px-6 text-body-sm text-text-secondary', className)} {...props} />;
}
