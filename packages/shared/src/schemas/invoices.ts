import { z } from 'zod';
import type { InvoiceStatus } from '../generated/prisma/enums.js';
import { InvoiceStatusSchema } from './cases.js';
import { DateInputSchema } from './common.js';

/** Positive amount with at most 2 decimals (DB column is DECIMAL(12,2)). */
export const InvoiceAmountSchema = z.coerce
  .number({ message: 'Дүн тоо байх ёстой' })
  .positive('Дүн 0-ээс их байх ёстой')
  .max(9_999_999_999.99, 'Дүн хэт их байна')
  .refine((value) => /^\d+(\.\d{1,2})?$/.test(String(value)), 'Дүн хамгийн ихдээ 2 орон бутархайтай байна');

const InvoiceDescriptionSchema = z.string().trim().min(3, 'Тайлбар хамгийн багадаа 3 тэмдэгт байна').max(500, 'Тайлбар хэт урт байна');

/** POST /invoices — invoiceNumber is generated (INV-2026-0001) and status starts as DRAFT. */
export const CreateInvoiceSchema = z.object({
  caseId: z.uuid({ message: 'Хэрэг сонгоно уу' }),
  amount: InvoiceAmountSchema,
  description: InvoiceDescriptionSchema,
  dueDate: DateInputSchema,
});
export type CreateInvoiceInput = z.infer<typeof CreateInvoiceSchema>;

/** PATCH /invoices/:id — amount/description/dueDate can only change while DRAFT. */
export const UpdateInvoiceSchema = z
  .object({
    amount: InvoiceAmountSchema,
    description: InvoiceDescriptionSchema,
    dueDate: DateInputSchema,
    status: InvoiceStatusSchema,
  })
  .partial();
export type UpdateInvoiceInput = z.infer<typeof UpdateInvoiceSchema>;

/** Allowed invoice status transitions. PAID and CANCELLED are final. */
export const INVOICE_STATUS_TRANSITIONS: Record<InvoiceStatus, readonly InvoiceStatus[]> = {
  DRAFT: ['SENT', 'CANCELLED'],
  SENT: ['PAID', 'OVERDUE', 'CANCELLED'],
  OVERDUE: ['PAID', 'CANCELLED'],
  PAID: [],
  CANCELLED: [],
};

export function canTransitionInvoice(from: InvoiceStatus, to: InvoiceStatus): boolean {
  return from === to || INVOICE_STATUS_TRANSITIONS[from].includes(to);
}
