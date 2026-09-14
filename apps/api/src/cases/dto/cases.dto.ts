import { createZodDto } from 'nestjs-zod';
import { CaseQuerySchema } from '@law-firm/shared';

export class CaseQueryDto extends createZodDto(CaseQuerySchema) {}
