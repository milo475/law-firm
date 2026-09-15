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

/**
 * Allowed invoice status transitions. PAID and CANCELLED are final.
 * SENT/OVERDUE → AWAITING_CONFIRMATION when the client reports a transfer;
 * AWAITING_CONFIRMATION → PAID (staff confirm) or → SENT (staff reject).
 */
export const INVOICE_STATUS_TRANSITIONS: Record<InvoiceStatus, readonly InvoiceStatus[]> = {
  DRAFT: ['SENT', 'CANCELLED'],
  SENT: ['AWAITING_CONFIRMATION', 'PAID', 'OVERDUE', 'CANCELLED'],
  OVERDUE: ['AWAITING_CONFIRMATION', 'PAID', 'CANCELLED'],
  AWAITING_CONFIRMATION: ['PAID', 'SENT'],
  PAID: [],
  CANCELLED: [],
};

/** Invoices the client can report as paid. */
export const CLIENT_PAYABLE_INVOICE_STATUSES = ['SENT', 'OVERDUE'] as const satisfies readonly InvoiceStatus[];

/** POST /invoices/:id/mark-paid — optional transfer details (reference, amount, date). */
export const MarkPaymentSchema = z.object({
  paymentNote: z.string().trim().max(500, 'Тэмдэглэл 500 тэмдэгтээс хэтрэхгүй байна').optional(),
});
export type MarkPaymentInput = z.infer<typeof MarkPaymentSchema>;

/** POST /invoices/:id/reject-payment — the reason is shown to the client. */
export const RejectPaymentSchema = z.object({
  reason: z
    .string({ message: 'Татгалзах шалтгааныг бичнэ үү' })
    .trim()
    .min(3, 'Татгалзах шалтгааныг бичнэ үү')
    .max(500, 'Шалтгаан 500 тэмдэгтээс хэтрэхгүй байна'),
});
export type RejectPaymentInput = z.infer<typeof RejectPaymentSchema>;

/** GET /settings/bank-account — where clients transfer invoice payments. */
export interface BankAccountSettings {
  bankName: string;
  accountNumber: string;
  accountName: string;
}

/** GET /invoices/payment-summary — reported payments waiting for staff confirmation. */
export interface InvoicePaymentSummary {
  total: number;
  invoices: { id: string; invoiceNumber: string; amount: string; caseId: string; caseNumber: string; paymentMarkedAt: Date | null }[];
}

export function canTransitionInvoice(from: InvoiceStatus, to: InvoiceStatus): boolean {
  return from === to || INVOICE_STATUS_TRANSITIONS[from].includes(to);
}
