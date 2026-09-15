import { createZodDto } from 'nestjs-zod';
import { CreateLawyerProfileSchema, UpdateLawyerProfileSchema } from '@law-firm/shared';

export class CreateLawyerProfileDto extends createZodDto(CreateLawyerProfileSchema) {}
export class UpdateLawyerProfileDto extends createZodDto(UpdateLawyerProfileSchema) {}
