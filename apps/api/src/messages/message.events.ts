import type { Role } from '@law-firm/shared';

export const MESSAGE_EVENTS = {
  sent: 'message.sent',
} as const;

export interface MessageSentEvent {
  caseRef: { id: string; caseNumber: string; clientId: string; lawyerId: string };
  message: { id: string; body: string; createdAt: Date };
  sender: { id: string; firstName: string; lastName: string; role: Role };
  /** CLIENT → the assigned lawyer; LAWYER or ADMIN → the client. */
  recipientId: string;
}
