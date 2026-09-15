// Client portal — «Миний хүсэлт»: requests for a lawyer or a consultation and what came of them.
'use client';

import Link from 'next/link';
import { useState } from 'react';
import { SERVICE_REQUEST_STATUS_BADGE, StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Pagination } from '@/components/ui/pagination';
import { CardSkeleton, EmptyState, ErrorState } from '@/components/ui/states';
import { ApiError, type ServiceRequestItem } from '@/lib/api';
import { CASE_TYPE_LABELS, SERVICE_REQUEST_TYPE_LABELS, formatDate } from '@/lib/format';
import { useMyServiceRequests } from '@/lib/service-requests';

export default function MyServiceRequestsPage() {
  const [page, setPage] = useState(1);
  const requests = useMyServiceRequests(page);
  const data = requests.data;

  return (
    <div className="flex flex-col gap-5 md:gap-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-1.5">
          <h2 className="text-h3 md:text-h2">Миний хүсэлт</h2>
          <p className="text-body-sm text-text-secondary md:text-body">
            Өмгөөлөгч авах, зөвлөгөө авах хүсэлтүүд. Хүсэлтийг хүлээж аваад өмгөөлөгч томилмогц хэрэг нээгдэнэ.
          </p>
        </div>
        <Button asChild size="md" className="w-full shrink-0 md:w-auto"><Link href="/portal/requests/new">Шинэ хүсэлт</Link></Button>
      </div>

      {requests.isError ? (
        <ErrorState message={requests.error instanceof ApiError ? requests.error.message : 'Хүсэлтүүдийг ачаалж чадсангүй'} onRetry={() => void requests.refetch()} />
      ) : !data ? (
        <div className="flex flex-col gap-4"><CardSkeleton /><CardSkeleton /></div>
      ) : data.items.length === 0 ? (
        <EmptyState
          title="Хүсэлт илгээгээгүй байна"
          description="Өмгөөлөгч авах эсвэл зөвлөгөө авах хүсэлтээ илгээхэд явц нь энд харагдана."
          action={<Button asChild size="md"><Link href="/portal/requests/new">Хүсэлт илгээх</Link></Button>}
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
  return (
    <Card className="flex flex-col gap-4 p-5 md:p-6" aria-labelledby={`request-${request.id}`}>
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <h3 id={`request-${request.id}`} className="text-h4 text-text-primary">{request.title}</h3>
          <p className="text-body-sm text-text-secondary">
            {SERVICE_REQUEST_TYPE_LABELS[request.type]} · {CASE_TYPE_LABELS[request.caseType] ?? request.caseType} · {formatDate(request.createdAt, true)}
          </p>
        </div>
        <StatusBadge map={SERVICE_REQUEST_STATUS_BADGE} status={request.status} className="self-start" />
      </div>
      <p className="line-clamp-3 whitespace-pre-line text-body-sm text-text-secondary">{request.description}</p>
      <RequestOutcome request={request} />
    </Card>
  );
}

/** What the client should know for each status: under review, accepted, the rejection reason, or the opened case. */
function RequestOutcome({ request }: { request: ServiceRequestItem }) {
  switch (request.status) {
    case 'NEW':
      return <p className="rounded-md bg-status-new-bg px-4 py-3 text-body-sm text-status-new-fg">Хүсэлтийг хянаж байна. Шийдвэр гармагц мэдэгдэл очно.</p>;
    case 'ACCEPTED':
      return (
        <p className="rounded-md bg-status-pending-bg px-4 py-3 text-body-sm text-status-pending-fg">
          Хүсэлтийг хүлээж авлаа{request.reviewedAt ? ` (${formatDate(request.reviewedAt)})` : ''}. Удахгүй өмгөөлөгч томилно.
        </p>
      );
    case 'REJECTED':
      return (
        <div className="flex flex-col gap-1 rounded-md bg-status-danger-bg px-4 py-3 text-status-danger-fg">
          <p className="text-body-sm-medium">Хүсэлтийг татгалзсан</p>
          {request.rejectionReason && <p className="text-body-sm">Шалтгаан: {request.rejectionReason}</p>}
        </div>
      );
    case 'CONVERTED':
      return (
        <div className="flex flex-col gap-3 rounded-md bg-status-progress-bg px-4 py-3 md:flex-row md:items-center md:justify-between">
          <p className="text-body-sm text-status-progress-fg">
            Өмгөөлөгч томилогдож{request.assignedCase ? `, ${request.assignedCase.caseNumber} хэрэг` : ' хэрэг'} нээгдлээ.
          </p>
          {request.assignedCase && (
            <Button asChild size="sm" className="shrink-0">
              <Link href={`/portal/cases/${request.assignedCase.id}`}>Хэрэг рүү очих</Link>
            </Button>
          )}
        </div>
      );
    default:
      return null;
  }
}
