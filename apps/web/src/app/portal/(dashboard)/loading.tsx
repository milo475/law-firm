import { Skeleton, TableSkeleton } from '@/components/ui/states';

export default function PortalLoading() {
  return (
    <div className="flex flex-col gap-6" aria-busy aria-label="Ачааллаж байна">
      <Skeleton className="h-8 w-56" />
      <TableSkeleton rows={4} />
    </div>
  );
}
