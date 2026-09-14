import { z } from 'zod';
import { CaseStatus, CaseType, InvoiceStatus } from '../generated/prisma/enums.js';
import { PaginationSchema } from './common.js';

export const CaseTypeSchema = z.enum(CaseType, { message: 'Хэргийн төрөл буруу байна' });
export const CaseStatusSchema = z.enum(CaseStatus, { message: 'Хэргийн төлөв буруу байна' });
export const InvoiceStatusSchema = z.enum(InvoiceStatus, { message: 'Нэхэмжлэхийн төлөв буруу байна' });

export const CaseQuerySchema = PaginationSchema.extend({
  status: CaseStatusSchema.optional(),
  type: CaseTypeSchema.optional(),
  search: z.string().trim().max(100).optional(),
});
export type CaseQueryInput = z.infer<typeof CaseQuerySchema>;

export const InvoiceQuerySchema = PaginationSchema.extend({
  status: InvoiceStatusSchema.optional(),
  caseId: z.uuid().optional(),
});
export type InvoiceQueryInput = z.infer<typeof InvoiceQuerySchema>;

/** Multipart form fields accompanying a document upload. */
export const UploadDocumentSchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  isVisibleToClient: z
    .union([z.boolean(), z.enum(['true', 'false'])])
    .transform((value) => value === true || value === 'true')
    .default(true),
});
export type UploadDocumentInput = z.infer<typeof UploadDocumentSchema>;

export const ALLOWED_DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
  'text/plain',
] as const;

export const MAX_DOCUMENT_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB
