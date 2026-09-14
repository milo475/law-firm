import { createZodDto } from 'nestjs-zod';
import { UploadDocumentSchema } from '@law-firm/shared';

export class UploadDocumentDto extends createZodDto(UploadDocumentSchema) {}
