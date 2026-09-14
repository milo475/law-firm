// Temporary — replaced by real Figma sections in the pages step.
export function Placeholder({ label, className = '' }: { label: string; className?: string }) {
  return <div className={`flex min-h-32 items-center justify-center rounded-lg border-2 border-dashed border-border-default bg-bg-brand-soft p-6 text-center text-body-sm text-text-muted ${className}`}>{label}</div>;
}
