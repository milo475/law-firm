import { createZodDto } from 'nestjs-zod';
import { ChangePasswordSchema, LoginSchema, RegisterSchema } from '@law-firm/shared';

export class LoginDto extends createZodDto(LoginSchema) {}
export class RegisterDto extends createZodDto(RegisterSchema) {}
export class ChangePasswordDto extends createZodDto(ChangePasswordSchema) {}
