// Admin page heading — same scale as the portal pages (H2 desktop / H3 mobile + body description).
export function AdminPageTitle({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="flex flex-col gap-1">
        <h2 className="text-h3 md:text-h2">{title}</h2>
        {description && <p className="text-body text-text-secondary">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
    </div>
  );
}
