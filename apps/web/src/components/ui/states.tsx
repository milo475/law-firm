export function LoadingState({ label = 'Ачааллаж байна…' }: { label?: string }) {
  return <p className="py-10 text-center text-sm text-slate-500">{label}</p>;
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
      {message}
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed border-brand-200 px-4 py-10 text-center text-sm text-slate-500">
      {message}
    </div>
  );
}
