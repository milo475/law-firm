import { createZodDto } from 'nestjs-zod';
import { ContactQuerySchema } from '@law-firm/shared';

export class ContactQueryDto extends createZodDto(ContactQuerySchema) {}
