import { Skeleton, TableSkeleton } from '@/components/ui/states';

export default function AdminLoading() {
  return (
    <div className="flex flex-col gap-6" aria-busy aria-label="Ачааллаж байна">
      <Skeleton className="h-9 w-64" />
      <TableSkeleton rows={5} />
    </div>
  );
}
