import { z } from 'zod';
import type { DocumentRequestStatus } from '../generated/prisma/enums.js';
import { DateInputSchema } from './common.js';

export const DOCUMENT_REQUEST_STATUSES = [
  'PENDING',
  'SUBMITTED',
  'UNDER_REVIEW',
  'APPROVED',
  'REJECTED',
] as const satisfies readonly DocumentRequestStatus[];
export const DocumentRequestStatusSchema = z.enum(DOCUMENT_REQUEST_STATUSES);

/** A client can upload at most this many files in one submission. */
export const MAX_DOCUMENT_REQUEST_FILES = 10;

const RequestTitleSchema = z
  .string({ message: 'Баримтын нэрийг бичнэ үү' })
  .trim()
  .min(2, 'Баримтын нэр хамгийн багадаа 2 тэмдэгт байна')
  .max(200, 'Баримтын нэр хэт урт байна');
const RequestDescriptionSchema = z.string().trim().max(2000, 'Заавар хэт урт байна');
const RejectionReasonSchema = z
  .string({ message: 'Буцаах шалтгааныг бичнэ үү' })
  .trim()
  .min(3, 'Буцаах шалтгааныг бичнэ үү')
  .max(1000, 'Шалтгаан хэт урт байна');

/** One row of the "request documents" checklist. */
export const DocumentRequestItemSchema = z.object({
  title: RequestTitleSchema,
  description: RequestDescriptionSchema.optional(),
  isRequired: z.boolean().default(true),
  dueDate: DateInputSchema.optional(),
});

/** POST /cases/:caseId/document-requests — one or many requests at once. */
export const CreateDocumentRequestSchema = z.object({
  items: z
    .array(DocumentRequestItemSchema)
    .min(1, 'Хамгийн багадаа нэг баримт нэмнэ үү')
    .max(20, 'Нэг удаад 20-оос ихгүй баримт хүсэх боломжтой'),
});
export type CreateDocumentRequestInput = z.infer<typeof CreateDocumentRequestSchema>;

/** PATCH /document-requests/:id — only while PENDING or REJECTED. No defaults, so omitted fields stay unchanged. */
export const UpdateDocumentRequestSchema = z.object({
  title: RequestTitleSchema.optional(),
  description: RequestDescriptionSchema.nullable().optional(),
  isRequired: z.boolean().optional(),
  dueDate: DateInputSchema.nullable().optional(),
});
export type UpdateDocumentRequestInput = z.infer<typeof UpdateDocumentRequestSchema>;

/** Body of the reject form (rejectionReason is mandatory). */
export const RejectDocumentRequestSchema = z.object({
  decision: z.literal('REJECTED'),
  rejectionReason: RejectionReasonSchema,
});

export const REVIEW_DECISIONS = ['UNDER_REVIEW', 'APPROVED', 'REJECTED'] as const satisfies readonly DocumentRequestStatus[];

/** POST /document-requests/:id/review — REJECTED requires a rejectionReason. */
export const ReviewDocumentRequestSchema = z
  .object({
    decision: z.enum(REVIEW_DECISIONS, { message: 'Шийдвэр буруу байна' }),
    rejectionReason: z.string().trim().max(1000, 'Шалтгаан хэт урт байна').optional(),
  })
  .superRefine((value, ctx) => {
    if (value.decision === 'REJECTED' && (!value.rejectionReason || value.rejectionReason.length < 3)) {
      ctx.addIssue({ code: 'custom', path: ['rejectionReason'], message: 'Буцаах шалтгааныг бичнэ үү' });
    }
  });
export type ReviewDocumentRequestInput = z.infer<typeof ReviewDocumentRequestSchema>;

export const DocumentRequestQuerySchema = z.object({
  status: DocumentRequestStatusSchema.optional(),
});
export type DocumentRequestQueryInput = z.infer<typeof DocumentRequestQuerySchema>;

/**
 * Allowed status transitions. The client moves PENDING/REJECTED → SUBMITTED; the lawyer reviews.
 * APPROVED is final.
 */
export const DOCUMENT_REQUEST_STATUS_TRANSITIONS: Record<DocumentRequestStatus, readonly DocumentRequestStatus[]> = {
  PENDING: ['SUBMITTED'],
  SUBMITTED: ['UNDER_REVIEW', 'APPROVED', 'REJECTED'],
  UNDER_REVIEW: ['APPROVED', 'REJECTED'],
  REJECTED: ['SUBMITTED'],
  APPROVED: [],
};

export function canTransitionDocumentRequest(from: DocumentRequestStatus, to: DocumentRequestStatus): boolean {
  return DOCUMENT_REQUEST_STATUS_TRANSITIONS[from].includes(to);
}

/** Statuses where the client still has to act (shown as "waiting for you"). */
export const DOCUMENT_REQUEST_CLIENT_ACTION_STATUSES = ['PENDING', 'REJECTED'] as const satisfies readonly DocumentRequestStatus[];

/** Statuses where the lawyer may still edit the request. */
export const DOCUMENT_REQUEST_EDITABLE_STATUSES = ['PENDING', 'REJECTED'] as const satisfies readonly DocumentRequestStatus[];
