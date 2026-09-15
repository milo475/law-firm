import { NotFoundException } from '@nestjs/common';
import { LAWYER_USER, OTHER_LAWYER, createPrismaMock, type PrismaMock } from '../common/testing/mocks';
import { PrismaService } from '../prisma/prisma.service';
import { NOTIFICATION_SELECT, NotificationsService } from './notifications.service';

const row = (id: string, isRead = false) => ({ id, type: 'TASK', title: `Мэдэгдэл ${id}`, body: 'LF-2026-0001', link: `/admin/tasks/${id}`, isRead, createdAt: new Date(), actor: null });

describe('NotificationsService', () => {
  let prisma: PrismaMock;
  let service: NotificationsService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new NotificationsService(prisma as unknown as PrismaService);
    prisma.notification.count.mockResolvedValue(3);
  });

  it('lists only the caller’s notifications, newest first, with the actor and a cursor when more remain', async () => {
    prisma.notification.findMany.mockResolvedValue([row('n1'), row('n2'), row('n3')]);
    const page = await service.findMine(LAWYER_USER.id, { filter: 'all', limit: 2 });

    expect(prisma.notification.findMany).toHaveBeenCalledWith({
      where: { userId: LAWYER_USER.id },
      select: NOTIFICATION_SELECT,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 3,
    });
    expect(NOTIFICATION_SELECT.actor).toEqual({ select: expect.objectContaining({ id: true, firstName: true, lastName: true }) });
    expect(page).toEqual({ items: [row('n1'), row('n2')].map((item) => ({ ...item, createdAt: expect.any(Date) })), unreadCount: 3, nextCursor: 'n2' });
  });

  it('filter=unread / read narrow the list; a cursor continues after the last loaded one and the last page has no cursor', async () => {
    prisma.notification.findMany.mockResolvedValue([row('n4')]);
    const unread = await service.findMine(LAWYER_USER.id, { filter: 'unread', limit: 20, cursor: '3f1c2b6e-8a4d-4c1e-9b2f-5d6e7a8b9c0d' });
    expect(prisma.notification.findMany.mock.calls[0][0]).toMatchObject({
      where: { userId: LAWYER_USER.id, isRead: false },
      cursor: { id: '3f1c2b6e-8a4d-4c1e-9b2f-5d6e7a8b9c0d' },
      skip: 1,
      take: 21,
    });
    expect(unread.nextCursor).toBeNull();

    await service.findMine(LAWYER_USER.id, { filter: 'read', limit: 20 });
    expect(prisma.notification.findMany.mock.calls[1][0].where).toEqual({ userId: LAWYER_USER.id, isRead: true });
  });

  it('unread-count counts only the caller’s unread notifications', async () => {
    await expect(service.unreadCount(LAWYER_USER.id)).resolves.toBe(3);
    expect(prisma.notification.count).toHaveBeenCalledWith({ where: { userId: LAWYER_USER.id, isRead: false } });
  });

  it('marking someone else’s notification read → 404 and nothing is updated', async () => {
    prisma.notification.findFirst.mockResolvedValue(null);
    await expect(service.markRead('n1', OTHER_LAWYER.id)).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.notification.findFirst).toHaveBeenCalledWith({ where: { id: 'n1', userId: OTHER_LAWYER.id }, select: NOTIFICATION_SELECT });
    expect(prisma.notification.update).not.toHaveBeenCalled();
  });

  it('marking an own unread notification read updates it once; an already read one is returned as is', async () => {
    prisma.notification.findFirst.mockResolvedValueOnce(row('n1')).mockResolvedValueOnce(row('n2', true));
    prisma.notification.update.mockResolvedValue(row('n1', true));
    await expect(service.markRead('n1', LAWYER_USER.id)).resolves.toMatchObject({ id: 'n1', isRead: true });
    expect(prisma.notification.update).toHaveBeenCalledWith({ where: { id: 'n1' }, data: { isRead: true }, select: NOTIFICATION_SELECT });
    await service.markRead('n2', LAWYER_USER.id);
    expect(prisma.notification.update).toHaveBeenCalledTimes(1);
  });

  it('read-all only touches the caller’s unread notifications', async () => {
    prisma.notification.updateMany.mockResolvedValue({ count: 4 });
    await expect(service.markAllRead(LAWYER_USER.id)).resolves.toEqual({ updated: 4 });
    expect(prisma.notification.updateMany).toHaveBeenCalledWith({ where: { userId: LAWYER_USER.id, isRead: false }, data: { isRead: true } });
  });

  it('createMany stores the actor (null for system events) and a null link when none is given', async () => {
    prisma.notification.createMany.mockResolvedValue({ count: 2 });
    await service.createMany([
      { userId: 'u1', type: 'TASK', title: 'A', body: 'a', link: '/admin/tasks/t1', actorId: LAWYER_USER.id },
      { userId: 'u2', type: 'CONTACT_REQUEST', title: 'B', body: 'b' },
    ]);
    expect(prisma.notification.createMany).toHaveBeenCalledWith({
      data: [
        { userId: 'u1', type: 'TASK', title: 'A', body: 'a', link: '/admin/tasks/t1', actorId: LAWYER_USER.id },
        { userId: 'u2', type: 'CONTACT_REQUEST', title: 'B', body: 'b', link: null, actorId: null },
      ],
    });
  });
});
