// Figma: 01 Public Site — page header band (bg-page, 72px padding, Display/H1 in text-brand, breadcrumb)
import { cn } from '@/lib/utils';
import { Breadcrumb, type Crumb } from './breadcrumb';

export interface PageHeaderProps {
  title: string;
  /** Shorter title for the 390 frame, when the design differs. */
  mobileTitle?: string;
  description?: string;
  /** Mobile frames often omit the description. */
  hideDescriptionOnMobile?: boolean;
  overline?: string;
  crumbs?: Crumb[];
  /** page (Figma default) | soft (brand-soft band) | inverse (navy hero) */
  tone?: 'page' | 'soft' | 'inverse';
  className?: string;
  children?: React.ReactNode;
}

export function PageHeader({ title, mobileTitle, description, hideDescriptionOnMobile, overline, crumbs, tone = 'page', className, children }: PageHeaderProps) {
  const inverse = tone === 'inverse';
  return (
    <section
      className={cn(
        tone === 'page' && 'bg-bg-page',
        tone === 'soft' && 'border-b border-border-default bg-bg-brand-soft',
        inverse && 'bg-bg-inverse text-text-on-inverse',
        className,
      )}
    >
      <div className="mx-auto flex max-w-[1200px] flex-col gap-4 px-5 py-12 md:px-6 md:py-[72px]">
        {crumbs && <Breadcrumb items={crumbs} tone={inverse ? 'inverse' : 'default'} />}
        {overline && <p className={cn('text-overline', inverse ? 'text-accent-default' : 'text-text-accent')}>{overline}</p>}
        <h1 className={cn('text-h2 md:text-h1', inverse ? 'text-text-on-inverse' : 'text-text-brand')}>
          {mobileTitle ? (
            <>
              <span className="md:hidden">{mobileTitle}</span>
              <span className="hidden md:inline">{title}</span>
            </>
          ) : title}
        </h1>
        {description && (
          <p className={cn('max-w-[760px] text-body md:text-body-lg', inverse ? 'text-text-on-inverse-muted' : 'text-text-secondary', hideDescriptionOnMobile && 'hidden md:block')}>
            {description}
          </p>
        )}
        {children}
      </div>
    </section>
  );
}
