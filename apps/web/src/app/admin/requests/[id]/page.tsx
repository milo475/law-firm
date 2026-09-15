'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { AssignRequestModal } from '@/components/admin/assign-request-modal';
import { RejectServiceRequestModal } from '@/components/admin/reject-service-request-modal';
import { useUser } from '@/components/portal/user-context';
import { SERVICE_REQUEST_STATUS_BADGE, StatusBadge } from '@/components/ui/badge';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CardSkeleton, ErrorState, Skeleton } from '@/components/ui/states';
import { toast } from '@/components/ui/toast';
import { ApiError, api, type ServiceRequestItem } from '@/lib/api';
import { CASE_TYPE_LABELS, SERVICE_REQUEST_TYPE_LABELS, formatDate } from '@/lib/format';
import { SERVICE_REQUESTS_KEY, serviceRequestKey } from '@/lib/service-requests';
import { shortName } from '@/lib/utils';

/** ADMIN: one service request — who asked, what happened, and the accept / reject / assign decision. */
export default function AdminServiceRequestPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useUser();
  const isAdmin = user.role === 'ADMIN';
  const queryClient = useQueryClient();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);

  const request = useQuery({
    queryKey: serviceRequestKey(id),
    queryFn: () => api.get<ServiceRequestItem>(`/service-requests/${id}`),
    retry: false,
    enabled: isAdmin,
  });

  // Detail, lists and the sidebar badge all live under the same key prefix.
  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: SERVICE_REQUESTS_KEY });
  };

  const accept = useMutation({
    mutationFn: () => api.post<ServiceRequestItem>(`/service-requests/${id}/accept`, {}),
    onSuccess: async (updated) => {
      queryClient.setQueryData(serviceRequestKey(id), updated);
      toast.success('Хүсэлтийг хүлээж авлаа', 'Харилцагчид мэдэгдэл очлоо. Одоо өмгөөлөгч хуваарилна уу.');
      await refresh();
    },
    onError: (error) => toast.danger('Хүлээж авч чадсангүй', error instanceof ApiError ? error.message : undefined),
  });

  if (!isAdmin) {
    return <ErrorState title="403 — Энэ хэсэг зөвхөн админд" message="Үйлчилгээний хүсэлтийг админ шийдвэрлэнэ." />;
  }
  if (request.isError) {
    const err = request.error;
    const forbidden = err instanceof ApiError && err.status === 403;
    return (
      <div className="flex flex-col gap-4">
        <Breadcrumb items={[{ label: 'Хүсэлтүүд', href: '/admin/requests' }, { label: forbidden ? 'Хандах эрхгүй' : 'Олдсонгүй' }]} />
        <ErrorState title={forbidden ? '403 — Хандах эрхгүй' : '404 — Хүсэлт олдсонгүй'} message={err instanceof ApiError ? err.message : 'Алдаа гарлаа'} />
        <div><Button asChild variant="secondary" size="sm"><Link href="/admin/requests">Хүсэлтүүд рүү буцах</Link></Button></div>
      </div>
    );
  }
  if (!request.data) {
    return <div className="flex flex-col gap-6"><Skeleton className="h-4 w-48" /><Skeleton className="h-10 w-1/2" /><CardSkeleton /></div>;
  }

  const item = request.data;
  const open = item.status === 'NEW' || item.status === 'ACCEPTED';

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb items={[{ label: 'Хүсэлтүүд', href: '/admin/requests' }, { label: item.title }]} />

      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-h3 md:text-h2">{item.title}</h2>
            <StatusBadge map={SERVICE_REQUEST_STATUS_BADGE} status={item.status} />
          </div>
          <p className="text-body-sm text-text-secondary">
            {SERVICE_REQUEST_TYPE_LABELS[item.type]} · {CASE_TYPE_LABELS[item.caseType] ?? item.caseType} · {formatDate(item.createdAt, true)}
          </p>
        </div>
        {open && (
          <div className="flex flex-wrap gap-2">
            {item.status === 'NEW' && (
              <Button size="md" disabled={accept.isPending} onClick={() => accept.mutate()}>{accept.isPending ? 'Түр хүлээнэ үү…' : 'Хүлээж авах'}</Button>
            )}
            {item.status === 'ACCEPTED' && <Button size="md" onClick={() => setAssignOpen(true)}>Өмгөөлөгч хуваарилах</Button>}
            <Button variant="secondary" size="md" disabled={accept.isPending} onClick={() => setRejectOpen(true)}>Татгалзах</Button>
          </div>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)]">
        <Card className="flex flex-col gap-4 p-6">
          <h3 className="text-h4">Юу болсон бэ</h3>
          <p className="whitespace-pre-line text-body text-text-primary">{item.description}</p>
        </Card>
        <div className="flex flex-col gap-5">
          <Card className="flex flex-col gap-4 p-6">
            <h3 className="text-h4">Хүсэлт гаргагч</h3>
            <dl className="flex flex-col gap-3">
              <Row
                label="Нэр"
                value={
                  <Link href={`/admin/clients/${item.requester.id}`} className="focus-ring rounded-sm text-text-accent hover:underline">
                    {shortName(item.requester.firstName, item.requester.lastName)}
                  </Link>
                }
              />
              <Row label="И-мэйл" value={<a href={`mailto:${item.requester.email}`} className="focus-ring rounded-sm text-text-accent hover:underline">{item.requester.email}</a>} />
              {item.requester.phone && (
                <Row label="Утас" value={<a href={`tel:${item.requester.phone}`} className="focus-ring rounded-sm text-text-accent hover:underline">{item.requester.phone}</a>} />
              )}
            </dl>
          </Card>
          <Card className="flex flex-col gap-4 p-6">
            <h3 className="text-h4">Шийдвэр</h3>
            <Decision item={item} />
          </Card>
        </div>
      </div>

      {open && <RejectServiceRequestModal request={item} open={rejectOpen} onOpenChange={setRejectOpen} onRejected={refresh} />}
      {item.status === 'ACCEPTED' && <AssignRequestModal request={item} open={assignOpen} onOpenChange={setAssignOpen} onAssigned={refresh} />}
    </div>
  );
}

function Decision({ item }: { item: ServiceRequestItem }) {
  const meta = [item.reviewedBy ? shortName(item.reviewedBy.firstName, item.reviewedBy.lastName) : null, item.reviewedAt ? formatDate(item.reviewedAt, true) : null]
    .filter(Boolean)
    .join(' · ');
  switch (item.status) {
    case 'NEW':
      return <p className="text-body-sm text-text-secondary">Шийдвэр гараагүй. Хүлээж аваад өмгөөлөгч хуваарилах эсвэл шалтгаантай татгалзана.</p>;
    case 'ACCEPTED':
      return (
        <div className="flex flex-col gap-1 rounded-md border-l-[3px] border-status-pending-fg bg-status-pending-bg px-4 py-3">
          <p className="text-body-sm-medium text-status-pending-fg">Хүлээж авсан — өмгөөлөгч хуваарилаагүй</p>
          {meta && <p className="text-caption text-text-muted">{meta}</p>}
        </div>
      );
    case 'REJECTED':
      return (
        <div className="flex flex-col gap-1 rounded-md border-l-[3px] border-status-danger-fg bg-status-danger-bg px-4 py-3">
          <p className="text-body-sm-medium text-status-danger-fg">Татгалзсан</p>
          {item.rejectionReason && <p className="text-body-sm text-text-secondary">{item.rejectionReason}</p>}
          {meta && <p className="text-caption text-text-muted">{meta}</p>}
        </div>
      );
    case 'CONVERTED':
      return (
        <div className="flex flex-col gap-1 rounded-md border-l-[3px] border-status-progress-fg bg-status-progress-bg px-4 py-3">
          <p className="text-body-sm-medium text-status-progress-fg">Хэрэг нээгдсэн</p>
          {item.assignedCase && (
            <Link href={`/admin/cases/${item.assignedCase.id}`} className="focus-ring self-start rounded-sm text-body-sm-medium text-text-accent hover:underline">
              {item.assignedCase.caseNumber} · {item.assignedCase.title} →
            </Link>
          )}
          {meta && <p className="text-caption text-text-muted">{meta}</p>}
        </div>
      );
    default:
      return null;
  }
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="shrink-0 text-body-sm text-text-muted">{label}</dt>
      <dd className="min-w-0 break-words text-right text-body-sm-medium text-text-primary">{value}</dd>
    </div>
  );
}
