import { z } from 'zod';

export const NOTIFICATION_FILTERS = ['all', 'unread', 'read'] as const;
export type NotificationFilter = (typeof NOTIFICATION_FILTERS)[number];
/** The portal lists up to 50 at once, so that stays the default page size. */
export const NOTIFICATION_PAGE_MAX = 50;

/** GET /notifications — newest first; `cursor` is the id of the last notification already loaded. */
export const NotificationListQuerySchema = z.object({
  filter: z.enum(NOTIFICATION_FILTERS, { message: 'Шүүлтүүр буруу байна (all, unread, read)' }).default('all'),
  cursor: z.uuid({ message: 'cursor буруу байна' }).optional(),
  limit: z.coerce.number().int().min(1).max(NOTIFICATION_PAGE_MAX).default(NOTIFICATION_PAGE_MAX),
});
export type NotificationListQueryInput = z.infer<typeof NotificationListQuerySchema>;
