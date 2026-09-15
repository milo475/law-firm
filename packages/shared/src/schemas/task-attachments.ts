import { z } from 'zod';
import { ALLOWED_DOCUMENT_MIME_TYPES, MAX_DOCUMENT_SIZE_BYTES } from './cases.js';

/** Task attachments accept the same file types and size as case documents. */
export const TASK_ATTACHMENT_MIME_TYPES = ALLOWED_DOCUMENT_MIME_TYPES;
export const MAX_TASK_ATTACHMENT_SIZE_BYTES = MAX_DOCUMENT_SIZE_BYTES;

/** POST /tasks/:id/attachments (multipart "file" + optional display name) */
export const UploadTaskAttachmentSchema = z.object({
  name: z.string().trim().min(1, 'Файлын нэр хоосон байж болохгүй').max(200, 'Файлын нэр хэт урт байна').optional(),
});
export type UploadTaskAttachmentInput = z.infer<typeof UploadTaskAttachmentSchema>;

export const TASK_ATTACHMENT_LABELS = {
  title: 'Хавсралт',
  upload: 'Файл хавсаргах',
  dropHint: 'Файлаа энд чирж оруулах эсвэл сонгох',
  formats: 'PDF, Word, Excel, JPG, PNG, TXT · 20MB хүртэл',
  empty: 'Хавсаргасан файл алга',
  missingFile: 'Файл сонгоно уу (multipart талбар: "file")',
  tooLarge: 'Файлын хэмжээ 20MB-аас хэтэрч болохгүй',
  unsupported: 'Зөвхөн PDF, Word, Excel, зураг, текст файл хавсаргах боломжтой',
  notFound: 'Хавсралт олдсонгүй',
  deleteForbidden: 'Зөвхөн өөрийн хавсаргасан файлыг устгах боломжтой',
} as const;
