import { createZodDto } from 'nestjs-zod';
import { PerformanceQuerySchema, PerformanceTimelineQuerySchema } from '@law-firm/shared';

export class PerformanceQueryDto extends createZodDto(PerformanceQuerySchema) {}
export class PerformanceTimelineQueryDto extends createZodDto(PerformanceTimelineQuerySchema) {}
