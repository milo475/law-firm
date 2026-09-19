// The firm's logo: a gradient triangle mark over the wordmark. The file keeps the two lockups the
// design uses — the mark beside the wordmark in the 88px headers, and the full vertical logo where
// there is room for it (footer, sign-in panel, sidebar).
import Image from 'next/image';
import Link from 'next/link';
import { FIRM_NAME } from '@/lib/brand';
import { cn } from '@/lib/utils';

const MARK = { src: '/brand/mark.png', width: 146, height: 127 };
const LOCKUP = { src: '/brand/logo.png', width: 338, height: 178 };


export interface LogoProps {
  theme?: 'light' | 'dark';
  href?: string | null;
  /** 1 = the design size: a 40px mark (compact) or a 208px wide logo (lockup). */
  scale?: number;
  /** 'compact' = mark + wordmark side by side; 'lockup' = the full logo image, wordmark included. */
  variant?: 'compact' | 'lockup';
  className?: string;
}

export function Logo({ theme = 'light', href = '/', scale = 1, variant = 'compact', className }: LogoProps) {
  const dark = theme === 'dark';
  // Decorative when the link around it already carries the firm name.
  const alt = href === null ? FIRM_NAME : '';
  const content =
    variant === 'lockup' ? (
      <Image
        src={LOCKUP.src}
        alt={alt}
        width={LOCKUP.width}
        height={LOCKUP.height}
        className={cn('h-auto', className)}
        style={{ width: 208 * scale }}
      />
    ) : (
      /* Two lines: one line of "STRATEGY LAW FIRM" next to six nav labels and two actions does not
         fit the 1200px header row. The «хуулийн фирм» tagline lives in the full lockup. */
      <span className={cn('inline-flex items-center', className)} style={{ gap: 10 * scale }}>
        <Image src={MARK.src} alt={alt} width={MARK.width} height={MARK.height} priority className="w-auto shrink-0" style={{ height: 40 * scale }} />
        <span className={cn('flex flex-col font-serif font-semibold whitespace-nowrap', dark ? 'text-text-on-inverse' : 'text-text-brand')} style={{ fontSize: 17 * scale, lineHeight: `${22 * scale}px` }}>
          <span>STRATEGY</span>
          <span>LAW FIRM</span>
        </span>
      </span>
    );
  if (!href) return content;
  return (
    <Link href={href} className="focus-ring rounded-md" aria-label={`${FIRM_NAME} — нүүр хуудас`}>
      {content}
    </Link>
  );
}
