import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  CASE_EVENT_TYPE_LABELS,
  CLIENT_NOTIFY_EVENT_TYPES,
  type CreateCaseEventInput,
  type UpdateCaseEventInput,
} from '@law-firm/shared';
import type { RequestUser } from '../common/types/request-user';
import { formatDateTimeMn } from '../common/utils/format';
import { PUBLIC_USER_SELECT } from '../common/utils/safe-user';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { CASE_MEMBERSHIP_SELECT, CasesService } from './cases.service';

const EVENT_INCLUDE = { createdBy: { select: PUBLIC_USER_SELECT } } as const;

@Injectable()
export class CaseEventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cases: CasesService,
    private readonly notifications: NotificationsService,
  ) {}

  /** ADMIN or assigned LAWYER. Visible HEARING/MEETING/DEADLINE events notify the client. */
  async create(caseId: string, input: CreateCaseEventInput, user: RequestUser) {
    const record = await this.cases.assertStaffAccessById(caseId, user);

    const event = await this.prisma.caseEvent.create({
      data: {
        caseId,
        type: input.type,
        title: input.title,
        description: input.description ?? null,
        eventDate: input.eventDate,
        isVisibleToClient: input.isVisibleToClient,
        createdById: user.id,
      },
      include: EVENT_INCLUDE,
    });

    if (input.isVisibleToClient && CLIENT_NOTIFY_EVENT_TYPES.includes(input.type)) {
      await this.notifications.createMany([
        {
          userId: record.clientId,
          type: 'CASE_EVENT',
          title: `${CASE_EVENT_TYPE_LABELS[input.type]}: ${input.title}`,
          body: `${record.caseNumber} · ${formatDateTimeMn(input.eventDate)}`,
          link: `/portal/cases/${caseId}`,
          actorId: user.id,
        },
      ]);
    }

    return event;
  }

  async update(eventId: string, input: UpdateCaseEventInput, user: RequestUser) {
    const existing = await this.loadWithAccess(eventId, user);
    if (existing.type === 'STATUS_CHANGE' && input.type !== undefined) {
      throw new BadRequestException('Төлөвийн өөрчлөлтийн бичлэгийн төрлийг солих боломжгүй');
    }
    return this.prisma.caseEvent.update({
      where: { id: eventId },
      data: {
        ...(input.type !== undefined ? { type: input.type } : {}),
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.eventDate !== undefined ? { eventDate: input.eventDate } : {}),
        ...(input.isVisibleToClient !== undefined ? { isVisibleToClient: input.isVisibleToClient } : {}),
      },
      include: EVENT_INCLUDE,
    });
  }

  async remove(eventId: string, user: RequestUser): Promise<void> {
    await this.loadWithAccess(eventId, user);
    await this.prisma.caseEvent.delete({ where: { id: eventId } });
  }

  private async loadWithAccess(eventId: string, user: RequestUser) {
    const event = await this.prisma.caseEvent.findUnique({
      where: { id: eventId },
      include: { case: { select: { lawyerId: true, clientId: true, members: CASE_MEMBERSHIP_SELECT } } },
    });
    if (!event) throw new NotFoundException('Үйл явдал олдсонгүй');
    this.cases.assertStaffAccess(event.case, user);
    return event;
  }
}
