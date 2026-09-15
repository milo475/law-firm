import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Role, SERVICE_REQUEST_TYPE_LABELS } from '@law-firm/shared';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  SERVICE_REQUEST_EVENTS,
  type ServiceRequestAssignedEvent,
  type ServiceRequestCreatedEvent,
  type ServiceRequestRef,
  type ServiceRequestRejectedEvent,
  type ServiceRequestReviewedEvent,
} from './service-request.events';

const TYPE = 'SERVICE_REQUEST';

/** Turns service request events into notifications: admins hear about new requests, the requester and the assigned lawyers about decisions. */
@Injectable()
export class ServiceRequestNotificationsListener {
  private readonly logger = new Logger(ServiceRequestNotificationsListener.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  @OnEvent(SERVICE_REQUEST_EVENTS.created)
  async onCreated({ request }: ServiceRequestCreatedEvent): Promise<void> {
    await this.safely(request, async () => {
      const admins = await this.prisma.user.findMany({ where: { role: Role.ADMIN, isActive: true }, select: { id: true } });
      await this.notifications.createMany(
        admins.map((admin) => ({
          userId: admin.id,
          type: TYPE,
          title: `Шинэ үйлчилгээний хүсэлт: ${request.title}`,
          body: `${request.requesterName} · ${SERVICE_REQUEST_TYPE_LABELS[request.type]}`,
          link: `/admin/requests/${request.id}`,
          actorId: request.requesterId,
        })),
      );
    });
  }

  @OnEvent(SERVICE_REQUEST_EVENTS.accepted)
  async onAccepted({ request, actorId }: ServiceRequestReviewedEvent): Promise<void> {
    await this.safely(request, () =>
      this.notifications.createMany([
        {
          userId: request.requesterId,
          type: TYPE,
          title: 'Таны хүсэлтийг хүлээж авлаа',
          body: `${request.title} · удахгүй өмгөөлөгч томилно`,
          link: '/portal/requests',
          actorId,
        },
      ]),
    );
  }

  @OnEvent(SERVICE_REQUEST_EVENTS.rejected)
  async onRejected({ request, actorId, reason }: ServiceRequestRejectedEvent): Promise<void> {
    await this.safely(request, () =>
      this.notifications.createMany([
        {
          userId: request.requesterId,
          type: TYPE,
          title: 'Таны хүсэлтийг татгалзлаа',
          body: `${request.title} · Шалтгаан: ${reason}`,
          link: '/portal/requests',
          actorId,
        },
      ]),
    );
  }

  @OnEvent(SERVICE_REQUEST_EVENTS.assigned)
  async onAssigned({ request, actorId, caseRef, leadId, memberIds }: ServiceRequestAssignedEvent): Promise<void> {
    await this.safely(request, () =>
      this.notifications.createMany([
        ...[leadId, ...memberIds].map((userId) => ({
          userId,
          type: TYPE,
          title: `Танд шинэ хэрэг хуваарилагдлаа: ${caseRef.caseNumber}`,
          body: userId === leadId ? `${caseRef.title} · ахлах өмгөөлөгчөөр` : caseRef.title,
          link: `/admin/cases/${caseRef.id}`,
          actorId,
        })),
        {
          userId: request.requesterId,
          type: TYPE,
          title: 'Таны хүсэлтэд өмгөөлөгч томилогдлоо, хэрэг нээгдлээ',
          body: `${caseRef.caseNumber} · ${caseRef.title}`,
          link: `/portal/cases/${caseRef.id}`,
          actorId,
        },
      ]),
    );
  }

  private async safely(request: ServiceRequestRef, work: () => Promise<unknown>): Promise<void> {
    try {
      await work();
    } catch (error) {
      this.logger.error(`Could not notify about service request ${request.id}: ${(error as Error).message}`);
    }
  }
}
