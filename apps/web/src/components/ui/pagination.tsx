// Figma: Design System / Pagination (9:43) — 44×44 buttons, active = brand-primary
// Server-safe when `hrefFor` is given (renders links); use `onPageChange` from client components.

import Link from 'next/link';
import { cn } from '@/lib/utils';

export interface PaginationProps {
  page: number;
  totalPages: number;
  /** Builds the href for a page (server-friendly). */
  hrefFor?: (page: number) => string;
  onPageChange?: (page: number) => void;
  className?: string;
}

function range(page: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set<number>([1, total, page - 1, page, page + 1].filter((p) => p >= 1 && p <= total));
  const sorted = [...pages].sort((a, b) => a - b);
  const out: (number | '…')[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push('…');
    out.push(p);
  });
  return out;
}

const cell = 'inline-flex size-11 items-center justify-center rounded-md border border-border-default bg-bg-surface text-body-sm-medium text-text-primary transition-colors focus-ring';

export function Pagination({ page, totalPages, hrefFor, onPageChange, className }: PaginationProps) {
  if (totalPages <= 1) return null;
  const items = range(page, totalPages);

  const render = (target: number, label: React.ReactNode, ariaLabel: string, disabled: boolean, active = false) => {
    const classes = cn(
      cell,
      active && 'border-brand-primary bg-brand-primary text-text-on-inverse',
      disabled && 'pointer-events-none text-text-disabled',
    );
    if (hrefFor) {
      if (disabled || active) {
        return <span aria-label={ariaLabel} aria-current={active ? 'page' : undefined} aria-disabled={disabled || undefined} className={classes}>{label}</span>;
      }
      return <Link href={hrefFor(target)} aria-label={ariaLabel} className={classes}>{label}</Link>;
    }
    return (
      <button type="button" onClick={() => onPageChange?.(target)} aria-label={ariaLabel} aria-current={active ? 'page' : undefined} disabled={disabled || active} className={classes}>
        {label}
      </button>
    );
  };

  return (
    <nav className={cn('flex flex-wrap items-center gap-2', className)} aria-label="Хуудаслалт">
      {render(page - 1, '‹', 'Өмнөх хуудас', page <= 1)}
      {items.map((item, i) =>
        item === '…' ? (
          <span key={`e${i}`} className={cn(cell, 'text-text-disabled')} aria-hidden>…</span>
        ) : (
          <span key={item}>{render(item, item, `${item}-р хуудас`, false, item === page)}</span>
        ),
      )}
      {render(page + 1, '›', 'Дараах хуудас', page >= totalPages)}
    </nav>
  );
}
