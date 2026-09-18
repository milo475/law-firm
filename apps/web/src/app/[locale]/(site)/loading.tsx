import { CardSkeleton, Skeleton } from '@/components/ui/states';

export default function SiteLoading() {
  return (
    <div className="mx-auto flex max-w-[1200px] flex-col gap-8 px-4 py-12 md:px-6">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-12 w-2/3" />
      <div className="grid gap-6 md:grid-cols-3">
        <CardSkeleton /><CardSkeleton /><CardSkeleton />
      </div>
    </div>
  );
}
