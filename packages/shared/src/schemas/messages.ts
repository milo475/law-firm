import { z } from 'zod';

export const MESSAGE_BODY_MAX = 2000;
export const MESSAGE_PAGE_MAX = 100;

/** POST /cases/:caseId/messages — text only; files go through document requests. */
export const SendMessageSchema = z.object({
  body: z
    .string({ message: 'Мессежээ бичнэ үү' })
    .trim()
    .min(1, 'Мессежээ бичнэ үү')
    .max(MESSAGE_BODY_MAX, `Мессеж ${MESSAGE_BODY_MAX} тэмдэгтээс хэтрэхгүй байна`),
});
export type SendMessageInput = z.infer<typeof SendMessageSchema>;

/** GET /cases/:caseId/messages — newest first; `cursor` is the id of the last message already loaded. */
export const MessageListQuerySchema = z.object({
  cursor: z.uuid({ message: 'cursor буруу байна' }).optional(),
  limit: z.coerce.number().int().min(1).max(MESSAGE_PAGE_MAX).default(30),
});
export type MessageListQueryInput = z.infer<typeof MessageListQuerySchema>;

export interface MessagePage<T> {
  items: T[];
  nextCursor: string | null;
}

export interface MessageUnreadSummary {
  total: number;
  cases: { caseId: string; caseNumber: string; title: string; count: number }[];
}
