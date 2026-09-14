import { z } from 'zod';
import { ContactStatus } from '../generated/prisma/enums.js';
import { EmailSchema, PaginationSchema, PhoneSchema } from './common.js';

export const ContactStatusSchema = z.enum(ContactStatus, { message: 'Төлөв буруу байна' });

/** Public contact form. */
export const ContactRequestSchema = z.object({
  name: z.string().trim().min(2, 'Нэрээ оруулна уу').max(120),
  phone: PhoneSchema,
  email: EmailSchema.optional(),
  subject: z.string().trim().min(3, 'Сэдвээ оруулна уу').max(200),
  message: z.string().trim().min(10, 'Мессеж хамгийн багадаа 10 тэмдэгт байна').max(4000),
});
export type ContactRequestInput = z.infer<typeof ContactRequestSchema>;

export const UpdateContactStatusSchema = z.object({
  status: ContactStatusSchema,
});
export type UpdateContactStatusInput = z.infer<typeof UpdateContactStatusSchema>;

export const ContactQuerySchema = PaginationSchema.extend({
  status: ContactStatusSchema.optional(),
});
export type ContactQueryInput = z.infer<typeof ContactQuerySchema>;
