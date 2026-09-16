'use client';

import { MAX_DOCUMENT_REQUEST_FILES } from '@law-firm/shared/schemas';
import { useQuery } from '@tanstack/react-query';
import { api, type DocumentRequestItem, type DocumentRequestStatus, type DocumentRequestSummary } from './api';

export const REQUEST_FILE_ACCEPT = '.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.txt';
const MAX_REQUEST_FILE_BYTES = 20 * 1024 * 1024;
export const MAX_REQUEST_FILES = MAX_DOCUMENT_REQUEST_FILES;
const ALLOWED_EXTENSIONS = new Set(['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png', 'txt']);

/** The client still has to send something. */
const CLIENT_ACTION_STATUSES: readonly DocumentRequestStatus[] = ['PENDING', 'REJECTED'];
/** The lawyer still has to look at the submission. */
export const AWAITING_REVIEW_STATUSES: readonly DocumentRequestStatus[] = ['SUBMITTED', 'UNDER_REVIEW'];

export const needsClientAction = (request: Pick<DocumentRequestItem, 'status'>) => CLIENT_ACTION_STATUSES.includes(request.status);
export const isAwaitingReview = (request: Pick<DocumentRequestItem, 'status'>) => AWAITING_REVIEW_STATUSES.includes(request.status);

/** Overdue while the client still has to act and the due date has passed. */
export function isRequestOverdue(request: Pick<DocumentRequestItem, 'status' | 'dueDate'>, now = new Date()): boolean {
  if (!request.dueDate || !needsClientAction(request)) return false;
  return new Date(request.dueDate).getTime() < now.getTime();
}

/** Splits picked files into accepted ones and Mongolian error messages (type / size / count). */
export function validateRequestFiles(files: File[], alreadySelected = 0): { accepted: File[]; errors: string[] } {
  const accepted: File[] = [];
  const errors: string[] = [];
  for (const file of files) {
    const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!ALLOWED_EXTENSIONS.has(extension)) {
      errors.push(`${file.name} — зөвхөн PDF, Word, Excel, JPG, PNG, TXT файл илгээнэ.`);
    } else if (file.size > MAX_REQUEST_FILE_BYTES) {
      errors.push(`${file.name} — 20MB-аас хэтэрсэн.`);
    } else if (alreadySelected + accepted.length >= MAX_REQUEST_FILES) {
      errors.push(`Нэг удаад ${MAX_REQUEST_FILES}-аас ихгүй файл илгээнэ.`);
      break;
    } else {
      accepted.push(file);
    }
  }
  return { accepted, errors };
}

export const DOCUMENT_REQUEST_SUMMARY_KEY = ['document-requests', 'summary'] as const;

/** Open request counts per case, scoped by role on the API. */
export function useDocumentRequestSummary(enabled = true) {
  return useQuery({
    queryKey: DOCUMENT_REQUEST_SUMMARY_KEY,
    queryFn: () => api.get<DocumentRequestSummary>('/document-requests/summary'),
    enabled,
    staleTime: 60_000,
  });
}
