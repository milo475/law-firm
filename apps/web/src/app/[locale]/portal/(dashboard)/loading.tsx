// Figma: 02 Client Portal — portal page header (H2 + Body, e.g. 04 Cases 30:187) over a table; no dedicated loading frame.
import { useTranslations } from 'next-intl';
import { Skeleton, TableSkeleton } from '@/components/ui/states';

export default function PortalLoading() {
  const t = useTranslations('portal');
  return (
    <div className="flex flex-col gap-6" aria-busy aria-label={t('loadingLabel')}>
      <div className="hidden flex-col gap-1.5 md:flex">
        <Skeleton className="h-11 w-72" />
        <Skeleton className="h-[26px] w-96 max-w-full" />
      </div>
      <TableSkeleton rows={4} />
    </div>
  );
}
