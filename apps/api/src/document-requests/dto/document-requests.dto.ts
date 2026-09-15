import { createZodDto } from 'nestjs-zod';
import {
  CreateDocumentRequestSchema,
  DocumentRequestQuerySchema,
  ReviewDocumentRequestSchema,
  UpdateDocumentRequestSchema,
} from '@law-firm/shared';

export class DocumentRequestQueryDto extends createZodDto(DocumentRequestQuerySchema) {}
export class CreateDocumentRequestDto extends createZodDto(CreateDocumentRequestSchema) {}
export class UpdateDocumentRequestDto extends createZodDto(UpdateDocumentRequestSchema) {}
export class ReviewDocumentRequestDto extends createZodDto(ReviewDocumentRequestSchema) {}
