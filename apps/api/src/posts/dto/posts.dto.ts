import { createZodDto } from 'nestjs-zod';
import { CreatePostSchema, PostManageQuerySchema, PostQuerySchema, UpdatePostSchema } from '@law-firm/shared';

export class CreatePostDto extends createZodDto(CreatePostSchema) {}
export class UpdatePostDto extends createZodDto(UpdatePostSchema) {}
export class PostQueryDto extends createZodDto(PostQuerySchema) {}
export class PostManageQueryDto extends createZodDto(PostManageQuerySchema) {}
