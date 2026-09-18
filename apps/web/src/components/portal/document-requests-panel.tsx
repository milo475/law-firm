'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { useRef, useState, type DragEvent } from 'react';
import { CheckIcon, CloseIcon, DownloadIcon, UploadCircleIcon } from '@/components/icons';
import { Badge, CLIENT_DOCUMENT_REQUEST_BADGE, StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FileChip } from '@/components/ui/file-chip';
import { toast } from '@/components/ui/toast';
import { ApiError, api, type DocumentItem, type DocumentRequestItem, type DocumentRequestStatus } from '@/lib/api';
import {
  DOCUMENT_REQUEST_SUMMARY_KEY,
  MAX_REQUEST_FILES,
  REQUEST_FILE_ACCEPT,
  isAwaitingReview,
  isRequestOverdue,
  needsClientAction,
  validateRequestFiles,
} from '@/lib/document-requests';
import { formatBytes, formatDate } from '@/lib/format';
import type { Locale } from '@/i18n/routing';
import { cn } from '@/lib/utils';

const CARD_TITLE = 'font-serif text-[20px] font-semibold leading-7 md:text-h4';
/** What the client should look at first. */
const CLIENT_ORDER: DocumentRequestStatus[] = ['REJECTED', 'PENDING', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED'];

/** Checklist of the documents the lawyer asked for on one case. */
export function DocumentRequestsPanel({ caseId, requests, onDownload }: {
  caseId: string;
  requests: DocumentRequestItem[];
  onDownload: (doc: DocumentItem) => void;
}) {
  const t = useTranslations('portal.documentRequests');
  const sorted = [...requests].sort((a, b) => CLIENT_ORDER.indexOf(a.status) - CLIENT_ORDER.indexOf(b.status));
  const waiting = requests.filter(needsClientAction).length;
  const approved = requests.filter((request) => request.status === 'APPROVED').length;
  const percent = requests.length === 0 ? 0 : Math.round((approved / requests.length) * 100);

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-3 p-[18px] md:flex-row md:items-center md:justify-between md:gap-6 md:p-6">
        <div className="flex min-w-0 flex-col gap-1">
          <h3 className={CARD_TITLE}>{t('title')}</h3>
          <p className="text-body-sm text-text-secondary">
            {waiting > 0 ? t('waiting', { count: waiting }) : t('allSubmitted')}
          </p>
        </div>
        <div className="flex flex-col gap-1.5 md:w-[240px] md:shrink-0">
          <p className="text-caption text-text-muted">{t('accepted', { approved, total: requests.length })}</p>
          <div
            role="progressbar"
            aria-label={t('acceptedLabel')}
            aria-valuemin={0}
            aria-valuemax={requests.length}
            aria-valuenow={approved}
            className="h-2 overflow-hidden rounded-full bg-bg-surface-alt"
          >
            <div className="h-full rounded-full bg-status-progress-fg transition-[width]" style={{ width: `${percent}%` }} />
          </div>
        </div>
      </Card>
      <ul className="flex flex-col gap-3" aria-label={t('listLabel')}>
        {sorted.map((request) => (
          <RequestItem key={request.id} caseId={caseId} request={request} onDownload={onDownload} />
        ))}
      </ul>
    </div>
  );
}

function RequestItem({ caseId, request, onDownload }: { caseId: string; request: DocumentRequestItem; onDownload: (doc: DocumentItem) => void }) {
  const t = useTranslations('portal.documentRequests');
  const tStatus = useTranslations('portal.documentRequests.status');
  const locale = useLocale() as Locale;
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const actionable = needsClientAction(request);
  const overdue = isRequestOverdue(request);

  const submit = useMutation({
    mutationFn: (selected: File[]) => {
      const form = new FormData();
      for (const file of selected) form.append('files', file);
      return api.post<DocumentRequestItem>(`/document-requests/${request.id}/submit`, form);
    },
    onSuccess: async () => {
      toast.success(t('submittedTitle'), t('submittedBody', { title: request.title }));
      setFiles([]);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['case-document-requests', caseId] }),
        queryClient.invalidateQueries({ queryKey: ['case-documents', caseId] }),
        queryClient.invalidateQueries({ queryKey: DOCUMENT_REQUEST_SUMMARY_KEY }),
      ]);
    },
    onError: (error) => toast.danger(t('submitFailed'), error instanceof ApiError ? error.message : t('tryAgain')),
  });

  function addFiles(list: FileList | File[]) {
    const { accepted, errors } = validateRequestFiles(Array.from(list), files.length, {
      type: (name) => t('fileTypeError', { name }),
      size: (name) => t('fileSizeError', { name }),
      count: (max) => t('fileCountError', { max }),
    });
    for (const message of errors) toast.warning(t('fileRejected'), message);
    if (accepted.length > 0) setFiles((current) => [...current, ...accepted]);
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    if (event.dataTransfer.files.length > 0) addFiles(event.dataTransfer.files);
  }

  const pickFiles = () => fileInput.current?.click();

  return (
    <li
      aria-label={request.title}
      className={cn(
        'flex flex-col gap-4 rounded-lg border border-border-default bg-bg-surface p-[18px] md:p-6',
        request.status === 'REJECTED' && 'border-l-[3px] border-l-status-danger-fg',
        request.status === 'APPROVED' && 'border-l-[3px] border-l-status-progress-fg',
      )}
    >
      <div className="flex items-start gap-3.5">
        <StatusMark status={request.status} />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-body-medium text-text-primary">{request.title}</p>
            {!request.isRequired && <Badge tone="closed" dot={false}>{t('optional')}</Badge>}
          </div>
          {request.description && <p className="text-body-sm text-text-secondary">{request.description}</p>}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <StatusBadge map={CLIENT_DOCUMENT_REQUEST_BADGE} status={request.status} label={tStatus(request.status)} />
            {request.dueDate && (
              <span className={cn('text-caption', overdue ? 'text-body-sm-medium text-status-danger-fg' : 'text-text-muted')}>
                {overdue ? `${t('overdue')} ` : `${t('due')} `}
                {formatDate(request.dueDate, locale)}
              </span>
            )}
          </div>
        </div>
      </div>

      {request.status === 'REJECTED' && request.rejectionReason && (
        <div role="alert" className="flex flex-col gap-1 rounded-md bg-status-danger-bg px-4 py-3 text-status-danger-fg">
          <p className="text-body-sm-medium">{t('rejectionTitle')}</p>
          <p className="text-body-sm">{request.rejectionReason}</p>
        </div>
      )}
      {isAwaitingReview(request) && (
        <p className="rounded-md bg-status-new-bg px-4 py-3 text-body-sm text-status-new-fg">{t('underReview')}</p>
      )}
      {request.status === 'APPROVED' && (
        <p className="text-body-sm-medium text-status-progress-fg">{t('approved')}{request.reviewedAt ? ` · ${formatDate(request.reviewedAt, locale)}` : ''}</p>
      )}

      {request.documents.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-caption text-text-muted">{request.status === 'REJECTED' ? t('previousFiles') : t('submittedFiles')}</p>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {request.documents.map((doc) => (
              <FileChip
                key={doc.id}
                name={doc.name}
                mimeType={doc.mimeType}
                meta={`${formatBytes(doc.size)} · ${formatDate(doc.createdAt, locale)}`}
                action={
                  <Button variant="ghost" size="icon" onClick={() => onDownload(doc)} aria-label={t('downloadNamed', { name: doc.name })} title={t('download')} className="-my-0.5 -mr-2 text-text-secondary hover:text-text-brand">
                    <DownloadIcon />
                  </Button>
                }
              />
            ))}
          </div>
        </div>
      )}

      {actionable && (
        <div className="flex flex-col gap-3">
          <input
            ref={fileInput}
            type="file"
            multiple
            accept={REQUEST_FILE_ACCEPT}
            className="sr-only"
            aria-label={t('pickFileFor', { title: request.title })}
            onChange={(event) => {
              if (event.target.files?.length) addFiles(event.target.files);
              event.target.value = '';
            }}
          />
          <div
            role="button"
            tabIndex={0}
            aria-label={t('dropZoneFor', { title: request.title })}
            onClick={pickFiles}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                pickFiles();
              }
            }}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={cn(
              'focus-ring flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border-[1.5px] border-dashed px-4 py-5 text-center transition-colors',
              dragging ? 'border-border-focus bg-bg-accent-soft' : 'border-border-brand bg-bg-brand-soft hover:bg-navy-100',
            )}
          >
            <UploadCircleIcon className="size-9 text-text-brand" />
            <p className="text-body-sm-medium text-text-brand">
              <span className="md:hidden">{t('pickFile')}</span>
              <span className="hidden md:inline">{t('dropZone')}</span>
            </p>
            <p className="text-caption text-text-secondary">{t('fileHint', { max: MAX_REQUEST_FILES })}</p>
          </div>
          {files.length > 0 && (
            <ul aria-label={t('filesToSend')} className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {files.map((file, index) => (
                <li key={`${file.name}-${file.size}-${index}`}>
                  <FileChip
                    name={file.name}
                    mimeType={file.type}
                    meta={formatBytes(file.size)}
                    action={
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={submit.isPending}
                        onClick={() => setFiles((current) => current.filter((_, i) => i !== index))}
                        aria-label={t('removeNamed', { name: file.name })}
                        title={t('remove')}
                        className="-my-0.5 -mr-2 text-text-secondary hover:text-text-brand"
                      >
                        <CloseIcon />
                      </Button>
                    }
                  />
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
            <Button size="md" className="w-full md:w-auto" disabled={files.length === 0 || submit.isPending} onClick={() => submit.mutate(files)}>
              {submit.isPending ? t('sending') : request.status === 'REJECTED' ? t('resend') : t('send')}
              {!submit.isPending && files.length > 0 ? ` (${files.length})` : ''}
            </Button>
            {files.length === 0 && <p className="text-caption text-text-muted">{t('pickFirst')}</p>}
          </div>
        </div>
      )}
    </li>
  );
}

/** Checklist mark: green tick when accepted, red ring when it must be resent, dashed while in review. */
function StatusMark({ status }: { status: DocumentRequestStatus }) {
  if (status === 'APPROVED') {
    return (
      <span aria-hidden className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-status-progress-fg text-text-on-inverse">
        <CheckIcon className="size-4" />
      </span>
    );
  }
  return (
    <span
      aria-hidden
      className={cn(
        'mt-0.5 size-7 shrink-0 rounded-full border-2',
        status === 'REJECTED' ? 'border-status-danger-fg' : status === 'PENDING' ? 'border-border-strong' : 'border-dashed border-status-new-fg',
      )}
    />
  );
}
