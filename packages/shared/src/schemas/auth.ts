import { z } from 'zod';
import { EmailSchema, MN_PHONE_REGEX, PasswordSchema, PhoneSchema } from './common.js';

/** Login with e-mail or phone number + password. */
export const LoginSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, 'И-мэйл эсвэл утасны дугаараа оруулна уу')
    .refine(
      (value) => value.includes('@') || MN_PHONE_REGEX.test(value),
      'И-мэйл эсвэл утасны дугаар буруу байна',
    ),
  password: z.string().min(1, 'Нууц үгээ оруулна уу'),
});
export type LoginInput = z.infer<typeof LoginSchema>;

/** Self-registration — always creates a CLIENT. */
export const RegisterSchema = z.object({
  email: EmailSchema,
  phone: PhoneSchema.optional(),
  password: PasswordSchema,
  firstName: z.string().trim().min(2, 'Нэр хамгийн багадаа 2 тэмдэгт байна').max(64),
  lastName: z.string().trim().min(2, 'Овог хамгийн багадаа 2 тэмдэгт байна').max(64),
});
export type RegisterInput = z.infer<typeof RegisterSchema>;

export const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Одоогийн нууц үгээ оруулна уу'),
    newPassword: PasswordSchema,
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'Шинэ нууц үг хуучин нууц үгтэй адил байж болохгүй',
    path: ['newPassword'],
  });
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;

/** Shape of the JWT access-token payload. */
export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: 'ADMIN' | 'LAWYER' | 'CLIENT';
  iat?: number;
  exp?: number;
}
