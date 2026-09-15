import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { CaseMemberRole } from '@law-firm/shared';
import { NotificationsService } from '../notifications/notifications.service';
import { CASE_MEMBER_EVENTS, type CaseMemberAddedEvent } from './case-member.events';

/** Tells a staff member they were added to a case team (not when they added themselves). */
@Injectable()
export class CaseMemberNotificationsListener {
  private readonly logger = new Logger(CaseMemberNotificationsListener.name);

  constructor(private readonly notifications: NotificationsService) {}

  @OnEvent(CASE_MEMBER_EVENTS.added)
  async onAdded(event: CaseMemberAddedEvent): Promise<void> {
    if (event.userId === event.actorId) return;
    try {
      await this.notifications.createMany([
        {
          userId: event.userId,
          type: 'CASE_MEMBER',
          title: `Танийг ${event.caseRef.caseNumber} багт нэмлээ`,
          body: event.role === CaseMemberRole.LEAD ? `${event.caseRef.title} · ахлах хуульчаар` : event.caseRef.title,
          link: `/admin/cases/${event.caseRef.id}`,
          actorId: event.actorId,
        },
      ]);
    } catch (error) {
      this.logger.error(`Could not notify ${event.userId} about case ${event.caseRef.caseNumber}: ${(error as Error).message}`);
    }
  }
}
