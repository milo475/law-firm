import { z } from 'zod';
import { ContactStatus } from '../generated/prisma/enums.js';
import { PaginationSchema } from './common.js';

// The public contact form was replaced by service requests; only the read-only ADMIN list of old messages remains.

export const ContactStatusSchema = z.enum(ContactStatus, { message: 'Төлөв буруу байна' });

/** GET /contact (ADMIN) — messages sent through the former contact form. */
export const ContactQuerySchema = PaginationSchema.extend({
  status: ContactStatusSchema.optional(),
});
export type ContactQueryInput = z.infer<typeof ContactQuerySchema>;
