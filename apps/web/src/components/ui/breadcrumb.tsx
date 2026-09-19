// Figma: Design System / Breadcrumb (9:37) — current page has no link
import Link from 'next/link';
import { ChevronRightIcon } from '@/components/icons';
import { cn } from '@/lib/utils';

export interface Crumb {
  label: string;
  href?: string;
}

export function Breadcrumb({ items, tone = 'default', label = 'Замын заалт', className }: { items: Crumb[]; tone?: 'default' | 'inverse'; label?: string; className?: string }) {
  const inverse = tone === 'inverse';
  return (
    <nav aria-label={label} className={className}>
      <ol className="flex flex-wrap items-center gap-2.5">
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li key={`${item.label}-${i}`} className="flex items-center gap-2.5">
              {item.href && !last ? (
                <Link
                  href={item.href}
                  className={cn(
                    // -my-1.5 keeps the trail's height while the hit area grows to 34px on a phone.
                    'focus-ring -my-1.5 inline-flex min-h-8 items-center rounded-sm py-1.5 text-body-sm',
                    inverse ? 'text-text-on-inverse-muted hover:text-text-on-inverse' : 'text-text-secondary hover:text-text-brand',
                  )}
                >
                  {item.label}
                </Link>
              ) : (
                <span className={cn('text-body-sm', last ? cn('text-body-sm-medium', inverse ? 'text-text-on-inverse' : 'text-text-primary') : inverse ? 'text-text-on-inverse-muted' : 'text-text-secondary')} aria-current={last ? 'page' : undefined}>
                  {item.label}
                </span>
              )}
              {!last && <ChevronRightIcon size={5} className={inverse ? 'text-text-on-inverse-muted' : 'text-text-muted'} />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
