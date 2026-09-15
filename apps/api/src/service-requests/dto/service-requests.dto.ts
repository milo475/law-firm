import { createZodDto } from 'nestjs-zod';
import {
  AssignServiceRequestSchema,
  CreateServiceRequestSchema,
  PaginationSchema,
  RejectServiceRequestSchema,
  ServiceRequestQuerySchema,
} from '@law-firm/shared';

export class CreateServiceRequestDto extends createZodDto(CreateServiceRequestSchema) {}
export class RejectServiceRequestDto extends createZodDto(RejectServiceRequestSchema) {}
export class AssignServiceRequestDto extends createZodDto(AssignServiceRequestSchema) {}
export class ServiceRequestQueryDto extends createZodDto(ServiceRequestQuerySchema) {}
export class ServiceRequestPageDto extends createZodDto(PaginationSchema) {}
