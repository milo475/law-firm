// Client portal — my requests: for a lawyer or a consultation, and what came of them.
'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { SERVICE_REQUEST_STATUS_BADGE, StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Pagination } from '@/components/ui/pagination';
import { CardSkeleton, EmptyState, ErrorState } from '@/components/ui/states';
import { ApiError, type ServiceRequestItem } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { useMyServiceRequests } from '@/lib/service-requests';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';

export default function MyServiceRequestsPage() {
  const t = useTranslations('portal.requests');
  const [page, setPage] = useState(1);
  const requests = useMyServiceRequests(page);
  const data = requests.data;

  return (
    <div className="flex flex-col gap-5 md:gap-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-1.5">
          <h2 className="text-h3 md:text-h2">{t('title')}</h2>
          <p className="text-body-sm text-text-secondary md:text-body">
            {t('description')}
          </p>
        </div>
        <Button asChild size="md" className="w-full shrink-0 md:w-auto"><Link href="/portal/requests/new">{t('newRequest')}</Link></Button>
      </div>

      {requests.isError ? (
        <ErrorState message={requests.error instanceof ApiError ? requests.error.message : t('loadError')} onRetry={() => void requests.refetch()} />
      ) : !data ? (
        <div className="flex flex-col gap-4"><CardSkeleton /><CardSkeleton /></div>
      ) : data.items.length === 0 ? (
        <EmptyState
          title={t('emptyTitle')}
          description={t('emptyDescription')}
          action={<Button asChild size="md"><Link href="/portal/requests/new">{t('send')}</Link></Button>}
        />
      ) : (
        <>
          <ul className="flex flex-col gap-4">
            {data.items.map((request) => (
              <li key={request.id}><RequestCard request={request} /></li>
            ))}
          </ul>
          <Pagination className="justify-center" page={data.page} totalPages={data.totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}

function RequestCard({ request }: { request: ServiceRequestItem }) {
  const tType = useTranslations('enums.serviceRequestType');
  const tCaseType = useTranslations('enums.caseType');
  const tStatus = useTranslations('enums.serviceRequestStatus');
  const locale = useLocale() as Locale;
  return (
    <Card className="flex flex-col gap-4 p-5 md:p-6" aria-labelledby={`request-${request.id}`}>
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <h3 id={`request-${request.id}`} className="text-h4 text-text-primary">{request.title}</h3>
          <p className="text-body-sm text-text-secondary">
            {tType(request.type)} · {tCaseType(request.caseType)} · {formatDate(request.createdAt, locale, true)}
          </p>
        </div>
        <StatusBadge map={SERVICE_REQUEST_STATUS_BADGE} status={request.status} label={tStatus(request.status)} className="self-start" />
      </div>
      <p className="line-clamp-3 whitespace-pre-line text-body-sm text-text-secondary">{request.description}</p>
      <RequestOutcome request={request} />
    </Card>
  );
}

/** What the client should know for each status: under review, accepted, the rejection reason, or the opened case. */
function RequestOutcome({ request }: { request: ServiceRequestItem }) {
  const t = useTranslations('portal.requests.outcome');
  const locale = useLocale() as Locale;
  switch (request.status) {
    case 'NEW':
      return <p className="rounded-md bg-status-new-bg px-4 py-3 text-body-sm text-status-new-fg">{t('review')}</p>;
    case 'ACCEPTED':
      return (
        <p className="rounded-md bg-status-pending-bg px-4 py-3 text-body-sm text-status-pending-fg">
          {request.reviewedAt ? t('acceptedOn', { date: formatDate(request.reviewedAt, locale) }) : t('accepted')}
        </p>
      );
    case 'REJECTED':
      return (
        <div className="flex flex-col gap-1 rounded-md bg-status-danger-bg px-4 py-3 text-status-danger-fg">
          <p className="text-body-sm-medium">{t('rejectedTitle')}</p>
          {request.rejectionReason && <p className="text-body-sm">{t('rejectedReason', { reason: request.rejectionReason })}</p>}
        </div>
      );
    case 'CONVERTED':
      return (
        <div className="flex flex-col gap-3 rounded-md bg-status-progress-bg px-4 py-3 md:flex-row md:items-center md:justify-between">
          <p className="text-body-sm text-status-progress-fg">
            {request.assignedCase ? t('convertedWithCase', { caseNumber: request.assignedCase.caseNumber }) : t('converted')}
          </p>
          {request.assignedCase && (
            <Button asChild size="sm" className="shrink-0">
              <Link href={`/portal/cases/${request.assignedCase.id}`}>{t('goToCase')}</Link>
            </Button>
          )}
        </div>
      );
    default:
      return null;
  }
}
