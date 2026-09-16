import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationsService } from '../notifications/notifications.service';
import { MESSAGE_EVENTS, type MessageSentEvent } from './message.events';

const MESSAGE_NOTIFICATION_TYPE = 'MESSAGE';

/**
 * One unread notification per conversation: while the recipient has not read the previous
 * "Шинэ мессеж" notification for this case, further messages do not create another one.
 */
@Injectable()
export class MessageNotificationsListener {
  private readonly logger = new Logger(MessageNotificationsListener.name);

  constructor(private readonly notifications: NotificationsService) {}

  @OnEvent(MESSAGE_EVENTS.sent)
  async onSent(event: MessageSentEvent): Promise<void> {
    const { caseRef, sender, message, recipientId } = event;
    const toClient = recipientId === caseRef.clientId;
    const link = toClient ? `/portal/cases/${caseRef.id}?tab=messages` : `/admin/cases/${caseRef.id}?tab=messages`;
    try {
      if (await this.notifications.hasUnread(recipientId, MESSAGE_NOTIFICATION_TYPE, link)) return;
      await this.notifications.createMany([
        {
          userId: recipientId,
          type: MESSAGE_NOTIFICATION_TYPE,
          title: `Шинэ мессеж: ${caseRef.caseNumber}`,
          body: `${senderName(sender.firstName, sender.lastName)}: ${excerpt(message.body)}`,
          link,
          actorId: sender.id,
        },
      ]);
    } catch (error) {
      this.logger.error(`Could not notify ${recipientId} about message ${message.id}: ${(error as Error).message}`);
    }
  }
}

function senderName(firstName: string, lastName: string): string {
  const initial = lastName.trim().charAt(0);
  return initial ? `${initial}. ${firstName}` : firstName;
}

function excerpt(body: string, max = 120): string {
  const flat = body.replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}
