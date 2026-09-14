import { createZodDto } from 'nestjs-zod';
import { InvoiceQuerySchema } from '@law-firm/shared';

export class InvoiceQueryDto extends createZodDto(InvoiceQuerySchema) {}
