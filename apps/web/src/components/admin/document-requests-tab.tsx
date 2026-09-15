'use client';

import { useMutation, type UseQueryResult } from '@tanstack/react-query';
import { useState } from 'react';
import { ConfirmModal } from '@/components/admin/confirm-modal';
import { DocumentRequestModal } from '@/components/admin/document-request-modal';
import { RejectRequestModal } from '@/components/admin/reject-request-modal';
import { PlusIcon } from '@/components/icons';
import { Badge, DOCUMENT_REQUEST_STATUS_BADGE, StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileChip } from '@/components/ui/file-chip';
import { Select } from '@/components/ui/select';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/states';
import { toast } from '@/components/ui/toast';
import { ApiError, api, type DocumentItem, type DocumentRequestItem, type DocumentRequestStatus } from '@/lib/api';
import { isAwaitingReview, isRequestOverdue, needsClientAction } from '@/lib/document-requests';
import { formatBytes, formatDate } from '@/lib/format';
import { cn, shortName } from '@/lib/utils';

type Filter = 'ALL' | DocumentRequestStatus;
const STATUS_ORDER: DocumentRequestStatus[] = ['SUBMITTED', 'UNDER_REVIEW', 'PENDING', 'REJECTED', 'APPROVED'];
const FILTER_OPTIONS = [
  { value: 'ALL', label: 'Бүх төлөв' },
  ...STATUS_ORDER.map((status) => ({ value: status, label: DOCUMENT_REQUEST_STATUS_BADGE[status].label })),
];

/** "Баримтын хүсэлт" tab: ask the client for documents, then review what they send. */
export function DocumentRequestsTab({ caseId, isClosed, requests, onChanged }: {
  caseId: string;
  isClosed: boolean;
  requests: UseQueryResult<DocumentRequestItem[]>;
  onChanged: () => Promise<void>;
}) {
  const [filter, setFilter] = useState<Filter>('ALL');
  const [editor, setEditor] = useState<{ open: boolean; request: DocumentRequestItem | null }>({ open: false, request: null });
  const [toReject, setToReject] = useState<DocumentRequestItem | null>(null);
  const [toDelete, setToDelete] = useState<DocumentRequestItem | null>(null);

  const review = useMutation({
    mutationFn: ({ request, decision }: { request: DocumentRequestItem; decision: 'UNDER_REVIEW' | 'APPROVED' }) =>
      api.post<DocumentRequestItem>(`/document-requests/${request.id}/review`, { decision }),
    onSuccess: async (updated, { decision }) => {
      if (decision === 'APPROVED') toast.success('Баримт батлагдлаа', `«${updated.title}» — харилцагчид мэдэгдэл очлоо.`);
      else toast.success('Хянаж эхэллээ', `«${updated.title}» хянагдаж буй төлөвт шилжлээ.`);
      await onChanged();
    },
    onError: (error) => toast.danger('Шийдвэр хадгалж чадсангүй', error instanceof ApiError ? error.message : undefined),
  });

  const remove = useMutation({
    mutationFn: (request: DocumentRequestItem) => api.delete(`/document-requests/${request.id}`),
    onSuccess: async () => {
      toast.success('Хүсэлт устгагдлаа');
      setToDelete(null);
      await onChanged();
    },
    onError: (error) => toast.danger('Устгаж чадсангүй', error instanceof ApiError ? error.message : undefined),
  });

  async function download(doc: DocumentItem) {
    try {
      const { url } = await api.get<{ url: string }>(`/documents/${doc.id}/download`);
      window.open(url, '_blank', 'noopener');
    } catch (error) {
      toast.danger('Татаж чадсангүй', error instanceof ApiError ? error.message : undefined);
    }
  }

  const all = requests.data ?? [];
  const sorted = [...all].sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status));
  const visible = filter === 'ALL' ? sorted : sorted.filter((request) => request.status === filter);
  const approved = all.filter((request) => request.status === 'APPROVED').length;
  const awaiting = all.filter(isAwaitingReview).length;
  const waitingOnClient = all.filter(needsClientAction).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <p className="min-w-0 flex-1 text-body-sm text-text-secondary">Харилцагчаас хэрэгтэй баримтаа нэрлэж хүснэ. Илгээсэн файлыг шалгаад батлах эсвэл шалтгаантай буцаана.</p>
        <Button size="sm" className="shrink-0 self-start" onClick={() => setEditor({ open: true, request: null })} disabled={isClosed}><PlusIcon size={16} />Баримт хүсэх</Button>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <Select wrapperClassName="w-full sm:w-[220px]" label="Төлөв" value={filter} onValueChange={(value) => setFilter(value as Filter)} options={FILTER_OPTIONS} />
        {all.length > 0 && (
          <p className="text-caption text-text-muted">
            Нийт {all.length} · батлагдсан {approved} · хянах {awaiting} · харилцагчаас хүлээгдэж буй {waitingOnClient}
          </p>
        )}
      </div>
      {isClosed && <p className="rounded-md bg-status-closed-bg px-4 py-3 text-body-sm text-status-closed-fg">Хэрэг хаагдсан тул шинэ баримт хүсэх боломжгүй.</p>}

      {requests.isError ? (
        <ErrorState message={requests.error instanceof ApiError ? requests.error.message : 'Алдаа гарлаа'} onRetry={() => void requests.refetch()} />
      ) : requests.isLoading ? (
        <Skeleton className="h-40" />
      ) : visible.length === 0 ? (
        <EmptyState
          title={all.length === 0 ? 'Баримтын хүсэлт алга' : 'Энэ төлөвтэй хүсэлт алга'}
          description={all.length === 0 ? '«Баримт хүсэх» товчоор харилцагчаас хэрэгтэй баримтуудаа нэг дор жагсааж хүснэ үү.' : undefined}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {visible.map((request) => (
            <RequestCard
              key={request.id}
              request={request}
              busy={review.isPending}
              onEdit={() => setEditor({ open: true, request })}
              onDelete={() => setToDelete(request)}
              onReject={() => setToReject(request)}
              onReview={(decision) => review.mutate({ request, decision })}
              onDownload={(doc) => void download(doc)}
            />
          ))}
        </ul>
      )}

      <DocumentRequestModal
        open={editor.open}
        request={editor.request}
        caseId={caseId}
        onOpenChange={(open) => setEditor((current) => ({ ...current, open }))}
        onSaved={() => void onChanged()}
      />
      <RejectRequestModal request={toReject} onOpenChange={(open) => !open && setToReject(null)} onRejected={() => void onChanged()} />
      <ConfirmModal
        open={Boolean(toDelete)}
        onOpenChange={(open) => !open && setToDelete(null)}
        title="Хүсэлт устгах"
        description={toDelete ? `«${toDelete.title}» хүсэлтийг устгах уу? Харилцагчийн жагсаалтаас хасагдана.` : ''}
        confirmLabel="Устгах"
        variant="danger"
        pending={remove.isPending}
        onConfirm={() => toDelete && remove.mutate(toDelete)}
      />
    </div>
  );
}

function RequestCard({ request, busy, onEdit, onDelete, onReject, onReview, onDownload }: {
  request: DocumentRequestItem;
  busy: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onReject: () => void;
  onReview: (decision: 'UNDER_REVIEW' | 'APPROVED') => void;
  onDownload: (doc: DocumentItem) => void;
}) {
  const overdue = isRequestOverdue(request);
  const editable = needsClientAction(request);
  const reviewable = isAwaitingReview(request);

  return (
    <li
      aria-label={request.title}
      className={cn(
        'flex flex-col gap-4 rounded-lg border border-border-default bg-bg-surface p-5',
        overdue && 'border-l-[3px] border-l-status-danger-fg',
        reviewable && 'border-l-[3px] border-l-status-new-fg',
      )}
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge map={DOCUMENT_REQUEST_STATUS_BADGE} status={request.status} />
            {!request.isRequired && <Badge tone="closed" dot={false}>Заавал биш</Badge>}
            {overdue && <Badge tone="danger" dot={false}>Хугацаа хэтэрсэн</Badge>}
          </div>
          <p className="text-body-medium text-text-primary">{request.title}</p>
          {request.description && <p className="text-body-sm text-text-secondary">{request.description}</p>}
          <p className="text-caption text-text-muted">
            Хүссэн {formatDate(request.createdAt)} · {shortName(request.requestedBy.firstName, request.requestedBy.lastName)}
            {request.dueDate && (
              <>
                {' · '}
                <span className={cn(overdue && 'text-body-sm-medium text-status-danger-fg')}>эцсийн хугацаа {formatDate(request.dueDate)}</span>
              </>
            )}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {reviewable && (
            <>
              {request.status === 'SUBMITTED' && <Button variant="ghost" size="sm" disabled={busy} onClick={() => onReview('UNDER_REVIEW')}>Хянаж эхлэх</Button>}
              <Button variant="secondary" size="sm" disabled={busy} onClick={onReject}>Буцаах</Button>
              <Button size="sm" disabled={busy} onClick={() => onReview('APPROVED')}>Батлах</Button>
            </>
          )}
          {editable && <Button variant="ghost" size="sm" onClick={onEdit}>Засах</Button>}
          {editable && request.documents.length === 0 && <Button variant="ghost" size="sm" onClick={onDelete}>Устгах</Button>}
        </div>
      </div>

      {request.status === 'REJECTED' && request.rejectionReason && (
        <p className="rounded-md bg-status-danger-bg px-4 py-3 text-body-sm text-status-danger-fg">
          <span className="text-body-sm-medium">Буцаасан шалтгаан:</span> {request.rejectionReason}
        </p>
      )}
      {request.status === 'APPROVED' && request.reviewedBy && (
        <p className="text-caption text-status-progress-fg">
          Баталсан: {shortName(request.reviewedBy.firstName, request.reviewedBy.lastName)} · {formatDate(request.reviewedAt, true)}
        </p>
      )}

      {request.documents.length > 0 ? (
        <div className="flex flex-col gap-2">
          <p className="text-caption text-text-muted">{request.status === 'REJECTED' ? 'Өмнө илгээсэн файл' : 'Илгээсэн файл'} ({request.documents.length})</p>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {request.documents.map((doc) => (
              <FileChip
                key={doc.id}
                name={doc.name}
                mimeType={doc.mimeType}
                meta={`${formatBytes(doc.size)} · ${formatDate(doc.createdAt, true)}`}
                action={<Button variant="ghost" size="sm" onClick={() => onDownload(doc)}>Татах</Button>}
              />
            ))}
          </div>
        </div>
      ) : request.status === 'PENDING' ? (
        <p className="text-caption text-text-muted">Харилцагч файл илгээгээгүй байна.</p>
      ) : null}
    </li>
  );
}
