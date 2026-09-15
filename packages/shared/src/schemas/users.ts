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

const ProfileTitleSchema = z.string().trim().min(2, 'Албан тушаал хамгийн багадаа 2 тэмдэгт байна').max(120, 'Албан тушаал хэт урт байна');
const ProfileBioSchema = z.string().trim().min(10, 'Танилцуулга хэт богино байна').max(5000, 'Танилцуулга хэт урт байна');
const ProfileSpecializationsSchema = z
  .array(z.string().trim().min(2, 'Мэргэшлийн чиглэл хэт богино байна').max(80))
  .max(20, 'Хамгийн ихдээ 20 чиглэл');
const ProfileEducationSchema = z.string().trim().min(2, 'Боловсролын мэдээлэл оруулна уу').max(2000);
const ProfileYearsSchema = z.number({ message: 'Туршлага тоо байх ёстой' }).int().min(0).max(80, 'Туршлага 80 жилээс хэтрэхгүй');
const ProfileSortOrderSchema = z.number({ message: 'Эрэмбэ тоо байх ёстой' }).int().min(0).max(1000);

export const LawyerProfileInputSchema = z.object({
  title: ProfileTitleSchema,
  bio: ProfileBioSchema,
  specializations: ProfileSpecializationsSchema.default([]),
  education: ProfileEducationSchema,
  yearsOfExperience: ProfileYearsSchema.default(0),
  isPublic: z.boolean().default(true),
  sortOrder: ProfileSortOrderSchema.default(0),
});

/** POST /lawyers/:userId/profile */
export const CreateLawyerProfileSchema = LawyerProfileInputSchema;
export type CreateLawyerProfileInput = z.infer<typeof CreateLawyerProfileSchema>;

/** PATCH /lawyers/:userId/profile — no defaults, so omitted fields stay untouched. */
export const UpdateLawyerProfileSchema = z
  .object({
    title: ProfileTitleSchema,
    bio: ProfileBioSchema,
    specializations: ProfileSpecializationsSchema,
    education: ProfileEducationSchema,
    yearsOfExperience: ProfileYearsSchema,
    isPublic: z.boolean(),
    sortOrder: ProfileSortOrderSchema,
  })
  .partial();
export type UpdateLawyerProfileInput = z.infer<typeof UpdateLawyerProfileSchema>;
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

/** Roles an admin can create from the admin panel (admins are provisioned separately). */
export const StaffCreatableRoleSchema = z.enum(['LAWYER', 'CLIENT'], { message: 'Зөвхөн хуульч эсвэл харилцагч үүсгэх боломжтой' });

/** POST /users (ADMIN) — when `password` is omitted the API generates a temporary one and returns it once. */
export const AdminCreateUserSchema = z.object({
  email: EmailSchema,
  phone: PhoneSchema.optional(),
  password: PasswordSchema.optional(),
  firstName: z.string().trim().min(2, 'Нэр хамгийн багадаа 2 тэмдэгт байна').max(64),
  lastName: z.string().trim().min(2, 'Овог хамгийн багадаа 2 тэмдэгт байна').max(64),
  role: StaffCreatableRoleSchema.default('CLIENT'),
  isActive: z.boolean().default(true),
});
export type AdminCreateUserInput = z.infer<typeof AdminCreateUserSchema>;

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
