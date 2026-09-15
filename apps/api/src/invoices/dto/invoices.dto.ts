import { createZodDto } from 'nestjs-zod';
import { CreateInvoiceSchema, InvoiceQuerySchema, UpdateInvoiceSchema } from '@law-firm/shared';

export class InvoiceQueryDto extends createZodDto(InvoiceQuerySchema) {}
export class CreateInvoiceDto extends createZodDto(CreateInvoiceSchema) {}
export class UpdateInvoiceDto extends createZodDto(UpdateInvoiceSchema) {}
