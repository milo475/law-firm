import { createZodDto } from 'nestjs-zod';
import {
  CaseQuerySchema,
  CloseCaseSchema,
  CreateCaseEventSchema,
  CreateCaseSchema,
  UpdateCaseEventSchema,
  UpdateCaseSchema,
} from '@law-firm/shared';

export class CaseQueryDto extends createZodDto(CaseQuerySchema) {}
export class CreateCaseDto extends createZodDto(CreateCaseSchema) {}
export class UpdateCaseDto extends createZodDto(UpdateCaseSchema) {}
export class CloseCaseDto extends createZodDto(CloseCaseSchema) {}
export class CreateCaseEventDto extends createZodDto(CreateCaseEventSchema) {}
export class UpdateCaseEventDto extends createZodDto(UpdateCaseEventSchema) {}
