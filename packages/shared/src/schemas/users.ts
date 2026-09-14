import { z } from 'zod';
import { Role } from '../generated/prisma/enums.js';
import { EmailSchema, PaginationSchema, PasswordSchema, PhoneSchema } from './common.js';

export const RoleSchema = z.enum(Role, { message: 'Хэрэглэгчийн эрх буруу байна' });

export const UpdateMeSchema = z
  .object({
    firstName: z.string().trim().min(2, 'Нэр хамгийн багадаа 2 тэмдэгт байна').max(64),
    lastName: z.string().trim().min(2, 'Овог хамгийн багадаа 2 тэмдэгт байна').max(64),
    phone: PhoneSchema.nullable(),
    avatarUrl: z.url({ message: 'Зургийн холбоос буруу байна' }).nullable(),
  })
  .partial();
export type UpdateMeInput = z.infer<typeof UpdateMeSchema>;

export const LawyerProfileInputSchema = z.object({
  title: z.string().trim().min(2).max(120),
  bio: z.string().trim().min(10, 'Танилцуулга хэт богино байна'),
  specializations: z.array(z.string().trim().min(2)).max(20).default([]),
  education: z.string().trim().min(2),
  yearsOfExperience: z.number().int().min(0).max(80).default(0),
  isPublic: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(0),
});
export type LawyerProfileInput = z.infer<typeof LawyerProfileInputSchema>;

/** Admin-only user creation. */
export const CreateUserSchema = z.object({
  email: EmailSchema,
  phone: PhoneSchema.optional(),
  password: PasswordSchema,
  firstName: z.string().trim().min(2).max(64),
  lastName: z.string().trim().min(2).max(64),
  role: RoleSchema.default('CLIENT'),
  isActive: z.boolean().default(true),
  lawyerProfile: LawyerProfileInputSchema.optional(),
});
export type CreateUserInput = z.infer<typeof CreateUserSchema>;

export const UpdateUserSchema = z
  .object({
    email: EmailSchema,
    phone: PhoneSchema.nullable(),
    password: PasswordSchema,
    firstName: z.string().trim().min(2).max(64),
    lastName: z.string().trim().min(2).max(64),
    role: RoleSchema,
    isActive: z.boolean(),
    avatarUrl: z.url().nullable(),
    lawyerProfile: LawyerProfileInputSchema.partial(),
  })
  .partial();
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;

export const UserQuerySchema = PaginationSchema.extend({
  role: RoleSchema.optional(),
  search: z.string().trim().max(100).optional(),
  isActive: z
    .union([z.boolean(), z.enum(['true', 'false'])])
    .transform((value) => value === true || value === 'true')
    .optional(),
});
export type UserQueryInput = z.infer<typeof UserQuerySchema>;
