export function PageHeader({ eyebrow, title, description }: { eyebrow?: string; title: string; description?: string }) {
  return (
    <div className="border-b border-brand-100 bg-brand-50">
      <div className="mx-auto max-w-6xl px-4 py-12">
        {eyebrow && <p className="text-xs font-semibold uppercase tracking-widest text-accent-600">{eyebrow}</p>}
        <h1 className="mt-2 text-3xl md:text-4xl">{title}</h1>
        {description && <p className="mt-3 max-w-2xl text-slate-600">{description}</p>}
      </div>
    </div>
  );
}
