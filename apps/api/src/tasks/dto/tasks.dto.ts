import { createZodDto } from 'nestjs-zod';
import { CreateTaskCommentSchema, CreateTaskSchema, TaskQuerySchema, UpdateTaskSchema } from '@law-firm/shared';

export class TaskQueryDto extends createZodDto(TaskQuerySchema) {}
export class CreateTaskDto extends createZodDto(CreateTaskSchema) {}
export class UpdateTaskDto extends createZodDto(UpdateTaskSchema) {}
export class CreateTaskCommentDto extends createZodDto(CreateTaskCommentSchema) {}
