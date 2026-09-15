import { createZodDto } from 'nestjs-zod';
import { AdminCreateUserSchema, UpdateMeSchema, UpdateUserSchema, UserQuerySchema } from '@law-firm/shared';

export class CreateUserDto extends createZodDto(AdminCreateUserSchema) {}
export class UpdateUserDto extends createZodDto(UpdateUserSchema) {}
export class UpdateMeDto extends createZodDto(UpdateMeSchema) {}
export class UserQueryDto extends createZodDto(UserQuerySchema) {}
