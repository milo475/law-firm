import { createZodDto } from 'nestjs-zod';
import { ContactQuerySchema, ContactRequestSchema, UpdateContactSchema } from '@law-firm/shared';

export class ContactRequestDto extends createZodDto(ContactRequestSchema) {}
export class UpdateContactDto extends createZodDto(UpdateContactSchema) {}
export class ContactQueryDto extends createZodDto(ContactQuerySchema) {}
