// Public page hero band (uses Display/H1, Overline, Breadcrumb tokens)
import { Breadcrumb, type Crumb } from './breadcrumb';

export function PageHeader({ overline, title, description, crumbs, children }: { overline?: string; title: string; description?: string; crumbs?: Crumb[]; children?: React.ReactNode }) {
  return (
    <section className="border-b border-border-default bg-bg-brand-soft">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-4 px-4 py-12 md:px-6 md:py-16">
        {crumbs && <Breadcrumb items={crumbs} />}
        {overline && <p className="text-overline text-text-accent">{overline}</p>}
        <h1 className="text-h2 md:text-h1">{title}</h1>
        {description && <p className="max-w-[720px] text-body-lg text-text-secondary">{description}</p>}
        {children}
      </div>
    </section>
  );
}
