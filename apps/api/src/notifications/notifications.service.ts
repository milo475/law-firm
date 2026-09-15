import { Injectable, NotFoundException } from '@nestjs/common';
import type { NotificationListQueryInput, Prisma } from '@law-firm/shared';
import { PUBLIC_USER_SELECT } from '../common/utils/safe-user';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateNotificationInput {
  userId: string;
  type: string;
  title: string;
  body: string;
  link?: string | null;
  /** Who caused it; omit for system or public events (e.g. the contact form). */
  actorId?: string | null;
}

export const NOTIFICATION_SELECT = {
  id: true,
  type: true,
  title: true,
  body: true,
  link: true,
  isRead: true,
  createdAt: true,
  actor: { select: PUBLIC_USER_SELECT },
} satisfies Prisma.NotificationSelect;

/** Every read and write is scoped to the signed-in user, whatever their role: nobody sees or changes another person's notifications. */
@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Newest first. `cursor` is the id of the last notification already loaded; `unreadCount` counts all of the user's unread ones. */
  async findMine(userId: string, query: NotificationListQueryInput) {
    const where: Prisma.NotificationWhereInput = {
      userId,
      ...(query.filter === 'unread' ? { isRead: false } : query.filter === 'read' ? { isRead: true } : {}),
    };
    const [rows, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        select: NOTIFICATION_SELECT,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: query.limit + 1,
        ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      }),
      this.unreadCount(userId),
    ]);
    const hasMore = rows.length > query.limit;
    const items = hasMore ? rows.slice(0, query.limit) : rows;
    return { items, unreadCount, nextCursor: hasMore ? items[items.length - 1].id : null };
  }

  unreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({ where: { userId, isRead: false } });
  }

  /** Someone else's notification is reported as not found, so ids cannot be probed. */
  async markRead(id: string, userId: string) {
    const notification = await this.prisma.notification.findFirst({ where: { id, userId }, select: NOTIFICATION_SELECT });
    if (!notification) throw new NotFoundException('Мэдэгдэл олдсонгүй');
    if (notification.isRead) return notification;
    return this.prisma.notification.update({ where: { id }, data: { isRead: true }, select: NOTIFICATION_SELECT });
  }

  async markAllRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    return { updated: result.count };
  }

  /** True when the user already has an unread notification of this type pointing at the same link. */
  async hasUnread(userId: string, type: string, link: string): Promise<boolean> {
    const found = await this.prisma.notification.findFirst({
      where: { userId, type, link, isRead: false },
      select: { id: true },
    });
    return Boolean(found);
  }

  /** Used by the domain listeners and services (tasks, messages, documents, invoices, contact form). */
  createMany(inputs: CreateNotificationInput[]) {
    if (inputs.length === 0) return Promise.resolve({ count: 0 });
    return this.prisma.notification.createMany({
      data: inputs.map((input) => ({ ...input, link: input.link ?? null, actorId: input.actorId ?? null })),
    });
  }
}
