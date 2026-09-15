import { createZodDto } from 'nestjs-zod';
import {
  CreateInvoiceSchema,
  InvoiceQuerySchema,
  MarkPaymentSchema,
  RejectPaymentSchema,
  UpdateInvoiceSchema,
} from '@law-firm/shared';

export class InvoiceQueryDto extends createZodDto(InvoiceQuerySchema) {}
export class CreateInvoiceDto extends createZodDto(CreateInvoiceSchema) {}
export class UpdateInvoiceDto extends createZodDto(UpdateInvoiceSchema) {}
export class MarkPaymentDto extends createZodDto(MarkPaymentSchema) {}
export class RejectPaymentDto extends createZodDto(RejectPaymentSchema) {}
