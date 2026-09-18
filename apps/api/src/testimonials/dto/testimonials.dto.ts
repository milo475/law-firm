import { createZodDto } from 'nestjs-zod';
import {
  CreateManualTestimonialSchema,
  CreateTestimonialSchema,
  PublicTestimonialQuerySchema,
  TestimonialQuerySchema,
  UpdateTestimonialSchema,
} from '@law-firm/shared';

export class CreateTestimonialDto extends createZodDto(CreateTestimonialSchema) {}
export class CreateManualTestimonialDto extends createZodDto(CreateManualTestimonialSchema) {}
export class UpdateTestimonialDto extends createZodDto(UpdateTestimonialSchema) {}
export class TestimonialQueryDto extends createZodDto(TestimonialQuerySchema) {}
export class PublicTestimonialQueryDto extends createZodDto(PublicTestimonialQuerySchema) {}
