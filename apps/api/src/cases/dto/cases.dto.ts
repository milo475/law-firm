import { createZodDto } from 'nestjs-zod';
import {
  CaseQuerySchema,
  CloseCaseSchema,
  CreateCaseMemberSchema,
  CreateCaseEventSchema,
  CreateCaseSchema,
  UpdateCaseEventSchema,
  UpdateCaseMemberSchema,
  UpdateCaseSchema,
} from '@law-firm/shared';

export class CaseQueryDto extends createZodDto(CaseQuerySchema) {}
export class CreateCaseDto extends createZodDto(CreateCaseSchema) {}
export class UpdateCaseDto extends createZodDto(UpdateCaseSchema) {}
export class CloseCaseDto extends createZodDto(CloseCaseSchema) {}
export class CreateCaseEventDto extends createZodDto(CreateCaseEventSchema) {}
export class UpdateCaseEventDto extends createZodDto(UpdateCaseEventSchema) {}
export class CreateCaseMemberDto extends createZodDto(CreateCaseMemberSchema) {}
export class UpdateCaseMemberDto extends createZodDto(UpdateCaseMemberSchema) {}
