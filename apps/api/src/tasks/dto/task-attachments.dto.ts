import { createZodDto } from 'nestjs-zod';
import { UploadTaskAttachmentSchema } from '@law-firm/shared';

export class UploadTaskAttachmentDto extends createZodDto(UploadTaskAttachmentSchema) {}
