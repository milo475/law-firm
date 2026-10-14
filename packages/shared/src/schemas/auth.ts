import { z } from 'zod';
import { EmailSchema, MN_PHONE_REGEX, PasswordSchema, PhoneSchema } from './common.js';

/** The languages a person can be written to in; mirrors the web app's routing locales. */
export const USER_LOCALES = ['mn', 'en', 'zh'] as const;
export type UserLocale = (typeof USER_LOCALES)[number];
export const UserLocaleSchema = z.enum(USER_LOCALES, { message: 'Хэл буруу байна' });

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
  /** The language the sign-up page was in; the account keeps it and is written to in it. */
  locale: UserLocaleSchema.optional(),
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

/** POST /auth/forgot-password — the answer is the same whether or not the address is registered. */
export const ForgotPasswordSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, 'И-мэйл эсвэл утасны дугаараа оруулна уу')
    .max(254, 'Хэт урт утга')
    .refine(
      (value) => value.includes('@') || MN_PHONE_REGEX.test(value),
      'И-мэйл эсвэл утасны дугаар буруу байна',
    ),
  /** Which language the e-mail should be written in; the account's own setting wins when it has one. */
  locale: UserLocaleSchema.optional(),
});
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;

/** Both one-time links end the same way: the raw token plus the password the person chooses. */
export const ResetPasswordSchema = z.object({
  token: z.string().trim().min(16, 'Холбоос буруу байна').max(256, 'Холбоос буруу байна'),
  password: PasswordSchema,
});
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;

/** Shape of the JWT access-token payload. */
export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: 'ADMIN' | 'LAWYER' | 'CLIENT';
  iat?: number;
  exp?: number;
}
