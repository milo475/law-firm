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

/** PATCH /contact/:id — forward-only status flow NEW → CONTACTED → CLOSED. */
export const UpdateContactSchema = z.object({
  status: ContactStatusSchema,
});
export type UpdateContactInput = z.infer<typeof UpdateContactSchema>;

/** @deprecated use UpdateContactSchema */
export const UpdateContactStatusSchema = UpdateContactSchema;
export type UpdateContactStatusInput = UpdateContactInput;

export const CONTACT_STATUS_TRANSITIONS: Record<ContactStatus, readonly ContactStatus[]> = {
  NEW: ['CONTACTED', 'CLOSED'],
  CONTACTED: ['CLOSED'],
  CLOSED: [],
};

export function canTransitionContact(from: ContactStatus, to: ContactStatus): boolean {
  return from === to || CONTACT_STATUS_TRANSITIONS[from].includes(to);
}

export const ContactQuerySchema = PaginationSchema.extend({
  status: ContactStatusSchema.optional(),
});
export type ContactQueryInput = z.infer<typeof ContactQuerySchema>;
