import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { formatDateMn } from '../common/utils/format';
import { NotificationsService, type CreateNotificationInput } from '../notifications/notifications.service';
import {
  DOCUMENT_REQUEST_EVENTS,
  type DocumentRequestCreatedEvent,
  type DocumentRequestReviewedEvent,
  type DocumentRequestSubmittedEvent,
} from './document-request.events';

const DOCUMENT_REQUEST_NOTIFICATION_TYPE = 'DOCUMENT_REQUEST';

const clientLink = (caseId: string) => `/portal/cases/${caseId}?tab=requests`;
const staffLink = (caseId: string) => `/admin/cases/${caseId}?tab=requests`;

/** Turns document request events into in-app notifications. A failure is logged, never thrown back. */
@Injectable()
export class DocumentRequestNotificationsListener {
  private readonly logger = new Logger(DocumentRequestNotificationsListener.name);

  constructor(private readonly notifications: NotificationsService) {}

  @OnEvent(DOCUMENT_REQUEST_EVENTS.created)
  async onCreated(event: DocumentRequestCreatedEvent): Promise<void> {
    const { requests, caseRef } = event;
    if (requests.length === 0) return;
    const title =
      requests.length === 1
        ? `Танаас баримт хүсэлээ: ${requests[0].title}`
        : `Танаас ${requests.length} баримт хүсэлээ: ${requests.map((request) => request.title).join(', ')}`;
    const earliestDue = requests
      .map((request) => request.dueDate)
      .filter((date): date is Date => date instanceof Date)
      .sort((a, b) => a.getTime() - b.getTime())[0];
    await this.notify({
      userId: caseRef.clientId,
      type: DOCUMENT_REQUEST_NOTIFICATION_TYPE,
      title: truncate(title),
      body: earliestDue ? `${caseRef.caseNumber} · эцсийн хугацаа ${formatDateMn(earliestDue)}` : caseRef.caseNumber,
      link: clientLink(caseRef.id),
      actorId: event.actorId,
    });
  }

  @OnEvent(DOCUMENT_REQUEST_EVENTS.submitted)
  async onSubmitted(event: DocumentRequestSubmittedEvent): Promise<void> {
    await this.notify({
      userId: event.caseRef.lawyerId,
      type: DOCUMENT_REQUEST_NOTIFICATION_TYPE,
      title: truncate(`Баримт ирлээ: ${event.request.title}`),
      body: `${event.caseRef.caseNumber} · ${event.fileCount} файл`,
      link: staffLink(event.caseRef.id),
      actorId: event.actorId,
    });
  }

  @OnEvent(DOCUMENT_REQUEST_EVENTS.reviewed)
  async onReviewed(event: DocumentRequestReviewedEvent): Promise<void> {
    const approved = event.decision === 'APPROVED';
    await this.notify({
      userId: event.caseRef.clientId,
      type: DOCUMENT_REQUEST_NOTIFICATION_TYPE,
      title: truncate(approved ? `Баримт хүлээн авлаа: ${event.request.title}` : `Дахин илгээнэ үү: ${event.rejectionReason ?? ''}`),
      body: approved ? event.caseRef.caseNumber : `${event.request.title} · ${event.caseRef.caseNumber}`,
      link: clientLink(event.caseRef.id),
      actorId: event.actorId,
    });
  }

  private async notify(input: CreateNotificationInput): Promise<void> {
    try {
      await this.notifications.createMany([input]);
    } catch (error) {
      this.logger.error(`Could not create notification "${input.title}": ${(error as Error).message}`);
    }
  }
}

function truncate(text: string, max = 180): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}
