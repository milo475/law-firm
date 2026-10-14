import { createZodDto } from 'nestjs-zod';
import { ChangePasswordSchema, ForgotPasswordSchema, LoginSchema, RegisterSchema, ResetPasswordSchema } from '@law-firm/shared';

export class LoginDto extends createZodDto(LoginSchema) {}
export class RegisterDto extends createZodDto(RegisterSchema) {}
export class ChangePasswordDto extends createZodDto(ChangePasswordSchema) {}
export class ForgotPasswordDto extends createZodDto(ForgotPasswordSchema) {}
export class ResetPasswordDto extends createZodDto(ResetPasswordSchema) {}
