// Figma: Design System / Breadcrumb (9:37) — current page has no link
import Link from 'next/link';
import { ChevronRightIcon } from '@/components/icons';
import { cn } from '@/lib/utils';

export interface Crumb {
  label: string;
  href?: string;
}

export function Breadcrumb({ items, className }: { items: Crumb[]; className?: string }) {
  return (
    <nav aria-label="Замын заалт" className={className}>
      <ol className="flex flex-wrap items-center gap-2.5">
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li key={`${item.label}-${i}`} className="flex items-center gap-2.5">
              {item.href && !last ? (
                <Link href={item.href} className="focus-ring rounded-sm text-body-sm text-text-secondary hover:text-text-brand">{item.label}</Link>
              ) : (
                <span className={cn('text-body-sm', last ? 'text-body-sm-medium text-text-primary' : 'text-text-secondary')} aria-current={last ? 'page' : undefined}>
                  {item.label}
                </span>
              )}
              {!last && <ChevronRightIcon size={5} className="text-text-muted" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
