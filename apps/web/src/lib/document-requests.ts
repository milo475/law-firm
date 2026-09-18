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

/** Messages for the three rejection reasons; localized surfaces pass their own, the admin panel keeps the defaults. */
export interface FileValidationMessages {
  type: (name: string) => string;
  size: (name: string) => string;
  count: (max: number) => string;
}

const DEFAULT_FILE_MESSAGES: FileValidationMessages = {
  type: (name) => `${name} — зөвхөн PDF, Word, Excel, JPG, PNG, TXT файл илгээнэ.`,
  size: (name) => `${name} — 20MB-аас хэтэрсэн.`,
  count: (max) => `Нэг удаад ${max}-аас ихгүй файл илгээнэ.`,
};

/** Splits picked files into accepted ones and error messages (type / size / count). */
export function validateRequestFiles(
  files: File[],
  alreadySelected = 0,
  messages: FileValidationMessages = DEFAULT_FILE_MESSAGES,
): { accepted: File[]; errors: string[] } {
  const accepted: File[] = [];
  const errors: string[] = [];
  for (const file of files) {
    const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!ALLOWED_EXTENSIONS.has(extension)) {
      errors.push(messages.type(file.name));
    } else if (file.size > MAX_REQUEST_FILE_BYTES) {
      errors.push(messages.size(file.name));
    } else if (alreadySelected + accepted.length >= MAX_REQUEST_FILES) {
      errors.push(messages.count(MAX_REQUEST_FILES));
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
