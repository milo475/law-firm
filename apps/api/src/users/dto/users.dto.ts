import { createZodDto } from 'nestjs-zod';
import { CreateUserSchema, UpdateMeSchema, UpdateUserSchema, UserQuerySchema } from '@law-firm/shared';

export class CreateUserDto extends createZodDto(CreateUserSchema) {}
export class UpdateUserDto extends createZodDto(UpdateUserSchema) {}
export class UpdateMeDto extends createZodDto(UpdateMeSchema) {}
export class UserQueryDto extends createZodDto(UserQuerySchema) {}
