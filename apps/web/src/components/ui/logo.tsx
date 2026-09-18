// Figma: Design System / Logo (13:19) — Theme: Light (on white) / Dark (on navy)
import Link from 'next/link';
import { cn } from '@/lib/utils';

export function Logo({ theme = 'light', href = '/', scale = 1, className }: { theme?: 'light' | 'dark'; href?: string | null; scale?: number; className?: string }) {
  const dark = theme === 'dark';
  const content = (
    <span className={cn('inline-flex items-center', className)} style={{ gap: 12 * scale }}>
      <span
        className={cn('flex shrink-0 items-center justify-center font-serif font-semibold', dark ? 'bg-accent-default text-text-on-accent' : 'bg-brand-primary text-accent-default')}
        style={{ width: 44 * scale, height: 44 * scale, borderRadius: 8 * scale, fontSize: 22 * scale, lineHeight: `${30 * scale}px` }}
        aria-hidden
      >
        L
      </span>
      <span className="flex flex-col" style={{ gap: 2 * scale }}>
        <span className={cn('font-serif font-semibold whitespace-nowrap', dark ? 'text-text-on-inverse' : 'text-text-brand')} style={{ fontSize: 22 * scale, lineHeight: `${30 * scale}px` }}>
          STRATEGY LAW FIRM
        </span>
        <span className="font-sans font-semibold uppercase tracking-[1.2px] text-text-accent whitespace-nowrap" style={{ fontSize: 12 * scale, lineHeight: `${16 * scale}px` }}>
          ХУУЛИЙН ФИРМ
        </span>
      </span>
    </span>
  );
  if (!href) return content;
  return (
    <Link href={href} className="focus-ring rounded-md" aria-label="Strategy Law Firm — нүүр хуудас">
      {content}
    </Link>
  );
}
