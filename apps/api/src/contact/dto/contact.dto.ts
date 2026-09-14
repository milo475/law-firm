import { createZodDto } from 'nestjs-zod';
import { ContactQuerySchema, ContactRequestSchema, UpdateContactStatusSchema } from '@law-firm/shared';

export class ContactRequestDto extends createZodDto(ContactRequestSchema) {}
export class UpdateContactStatusDto extends createZodDto(UpdateContactStatusSchema) {}
export class ContactQueryDto extends createZodDto(ContactQuerySchema) {}
