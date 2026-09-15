import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  Role,
  type MessageListQueryInput,
  type MessageUnreadSummary,
  type Prisma,
  type SendMessageInput,
} from '@law-firm/shared';
import { CasesService } from '../cases/cases.service';
import type { RequestUser } from '../common/types/request-user';
import { PUBLIC_USER_SELECT } from '../common/utils/safe-user';
import { PrismaService } from '../prisma/prisma.service';
import { MESSAGE_EVENTS, type MessageSentEvent } from './message.events';

const MESSAGE_SELECT = {
  id: true,
  caseId: true,
  body: true,
  readAt: true,
  createdAt: true,
  sender: { select: PUBLIC_USER_SELECT },
} as const;

@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cases: CasesService,
    private readonly events: EventEmitter2,
  ) {}

  /** Newest first. Pass the id of the oldest message already loaded as `cursor` to get older ones. */
  async list(caseId: string, query: MessageListQueryInput, user: RequestUser) {
    await this.cases.assertAccessById(caseId, user);
    const rows = await this.prisma.message.findMany({
      where: { caseId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      select: MESSAGE_SELECT,
    });
    const hasMore = rows.length > query.limit;
    const items = hasMore ? rows.slice(0, query.limit) : rows;
    return { items, nextCursor: hasMore ? items[items.length - 1].id : null };
  }

  /** Anyone who can open the case may write. The other side gets a notification via message.sent. */
  async send(caseId: string, input: SendMessageInput, user: RequestUser) {
    const record = await this.cases.assertAccessById(caseId, user);
    const message = await this.prisma.message.create({
      data: { caseId, senderId: user.id, body: input.body },
      select: MESSAGE_SELECT,
    });

    const event: MessageSentEvent = {
      caseRef: { id: caseId, caseNumber: record.caseNumber, clientId: record.clientId, lawyerId: record.lawyerId },
      message: { id: message.id, body: message.body, createdAt: message.createdAt },
      sender: { id: user.id, firstName: message.sender.firstName, lastName: message.sender.lastName, role: user.role },
      recipientId: user.role === Role.CLIENT ? record.lawyerId : record.clientId,
    };
    await this.events.emitAsync(MESSAGE_EVENTS.sent, event);
    return message;
  }

  async unreadCount(caseId: string, user: RequestUser): Promise<{ count: number }> {
    await this.cases.assertAccessById(caseId, user);
    const unread = this.unreadWhere(user);
    if (!unread) return { count: 0 };
    return { count: await this.prisma.message.count({ where: { caseId, ...unread } }) };
  }

  /** Marks the messages addressed to the user's side as read. ADMIN only views, so nothing changes for them. */
  async markRead(caseId: string, user: RequestUser): Promise<{ updated: number }> {
    await this.cases.assertAccessById(caseId, user);
    const unread = this.unreadWhere(user);
    if (!unread) return { updated: 0 };
    const result = await this.prisma.message.updateMany({ where: { caseId, ...unread }, data: { readAt: new Date() } });
    return { updated: result.count };
  }

  /** Unread messages per case across the user's cases (sidebar badge). */
  async unreadSummary(user: RequestUser): Promise<MessageUnreadSummary> {
    const unread = this.unreadWhere(user);
    if (!unread) return { total: 0, cases: [] };
    const groups = await this.prisma.message.groupBy({ by: ['caseId'], where: unread, _count: { _all: true } });
    if (groups.length === 0) return { total: 0, cases: [] };

    const cases = await this.prisma.case.findMany({
      where: { id: { in: groups.map((group) => group.caseId) } },
      select: { id: true, caseNumber: true, title: true },
    });
    const byId = new Map(cases.map((item) => [item.id, item]));
    const rows = groups
      .map((group) => ({
        caseId: group.caseId,
        caseNumber: byId.get(group.caseId)?.caseNumber ?? '',
        title: byId.get(group.caseId)?.title ?? '',
        count: group._count._all,
      }))
      .sort((a, b) => b.count - a.count);
    return { total: rows.reduce((sum, row) => sum + row.count, 0), cases: rows };
  }

  /** Inbox: every case in scope that has messages, with its latest message and unread count, newest first. */
  async conversations(user: RequestUser) {
    const cases = await this.prisma.case.findMany({
      where: { messages: { some: {} }, ...this.cases.scopeFor(user) },
      select: {
        id: true,
        caseNumber: true,
        title: true,
        status: true,
        client: { select: PUBLIC_USER_SELECT },
        lawyer: { select: PUBLIC_USER_SELECT },
        messages: { orderBy: { createdAt: 'desc' }, take: 1, select: MESSAGE_SELECT },
      },
      take: 100,
    });
    const unread = this.unreadWhere(user);
    const counts =
      unread && cases.length > 0
        ? await this.prisma.message.groupBy({
            by: ['caseId'],
            where: { ...unread, caseId: { in: cases.map((item) => item.id) } },
            _count: { _all: true },
          })
        : [];
    const countByCase = new Map(counts.map((group) => [group.caseId, group._count._all]));

    return cases
      .map(({ messages, ...item }) => ({ ...item, lastMessage: messages[0] ?? null, unreadCount: countByCase.get(item.id) ?? 0 }))
      .sort((a, b) => (b.lastMessage?.createdAt.getTime() ?? 0) - (a.lastMessage?.createdAt.getTime() ?? 0));
  }

  /**
   * Messages the user still has to read: a CLIENT reads what the staff wrote, the assigned LAWYER reads what the
   * client wrote. ADMIN is a viewer — nothing is unread for them and opening a thread marks nothing.
   */
  private unreadWhere(user: RequestUser): Prisma.MessageWhereInput | null {
    if (user.role === Role.CLIENT) return { readAt: null, senderId: { not: user.id }, case: { clientId: user.id } };
    if (user.role === Role.LAWYER) return { readAt: null, sender: { role: Role.CLIENT }, case: { lawyerId: user.id } };
    return null;
  }
}
