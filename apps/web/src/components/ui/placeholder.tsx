/** Dashed box used for sections whose final design will come from Figma. */
export function Placeholder({ label, className = '' }: { label: string; className?: string }) {
  return (
    <div
      className={`flex min-h-32 items-center justify-center rounded-lg border-2 border-dashed border-brand-200 bg-brand-50/60 p-6 text-center text-sm text-brand-300 ${className}`}
    >
      {label}
    </div>
  );
}
