import { ForbiddenException } from '@nestjs/common';
import type { EventEmitter2 } from '@nestjs/event-emitter';
import { CasesService } from '../cases/cases.service';
import {
  ADMIN_USER,
  CLIENT_USER,
  LAWYER_USER,
  OTHER_CLIENT,
  OTHER_LAWYER,
  createPrismaMock,
  type PrismaMock,
} from '../common/testing/mocks';
import type { RequestUser } from '../common/types/request-user';
import { PrismaService } from '../prisma/prisma.service';
import { MESSAGE_EVENTS } from './message.events';
import { MessagesService } from './messages.service';

const caseRecord = {
  id: 'case-1',
  caseNumber: 'LF-2026-0001',
  title: 'Түрээсийн маргаан',
  clientId: CLIENT_USER.id,
  lawyerId: LAWYER_USER.id,
  status: 'IN_PROGRESS',
};

const person = (user: RequestUser) => ({ id: user.id, firstName: 'Нэр', lastName: 'Овог', avatarUrl: null, role: user.role });
const row = (id: string, minutesAgo: number, from: RequestUser = CLIENT_USER) => ({
  id,
  caseId: 'case-1',
  body: `Мессеж ${id}`,
  readAt: null,
  createdAt: new Date(Date.now() - minutesAgo * 60_000),
  sender: person(from),
});

describe('MessagesService', () => {
  let prisma: PrismaMock;
  let events: { emitAsync: jest.Mock };
  let service: MessagesService;

  beforeEach(() => {
    prisma = createPrismaMock();
    events = { emitAsync: jest.fn().mockResolvedValue([]) };
    service = new MessagesService(prisma as unknown as PrismaService, new CasesService(prisma as unknown as PrismaService), events as unknown as EventEmitter2);
    prisma.case.findUnique.mockResolvedValue(caseRecord);
    const people: Record<string, RequestUser> = { [CLIENT_USER.id]: CLIENT_USER, [LAWYER_USER.id]: LAWYER_USER, [ADMIN_USER.id]: ADMIN_USER };
    prisma.message.create.mockImplementation(async ({ data }: any) => ({
      id: 'msg-new',
      caseId: data.caseId,
      body: data.body,
      readAt: null,
      createdAt: new Date(),
      sender: person(people[data.senderId]),
    }));
  });

  describe('access', () => {
    it("another CLIENT cannot read the case's messages → 403", async () => {
      await expect(service.list('case-1', { limit: 30 }, OTHER_CLIENT)).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.message.findMany).not.toHaveBeenCalled();
    });

    it('another LAWYER cannot post → 403, nothing stored, no event', async () => {
      await expect(service.send('case-1', { body: 'Сайн байна уу' }, OTHER_LAWYER)).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.message.create).not.toHaveBeenCalled();
      expect(events.emitAsync).not.toHaveBeenCalled();
    });

    it('another CLIENT cannot read the unread count or mark the thread read → 403', async () => {
      await expect(service.unreadCount('case-1', OTHER_CLIENT)).rejects.toBeInstanceOf(ForbiddenException);
      await expect(service.markRead('case-1', OTHER_CLIENT)).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.message.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('send', () => {
    it('a CLIENT message is addressed to the assigned lawyer', async () => {
      await service.send('case-1', { body: 'Эвлэрлийн санал ирлээ' }, CLIENT_USER);
      expect(prisma.message.create.mock.calls[0][0].data).toEqual({ caseId: 'case-1', senderId: CLIENT_USER.id, body: 'Эвлэрлийн санал ирлээ' });
      expect(events.emitAsync).toHaveBeenCalledWith(
        MESSAGE_EVENTS.sent,
        expect.objectContaining({
          recipientId: LAWYER_USER.id,
          caseRef: { id: 'case-1', caseNumber: 'LF-2026-0001', clientId: CLIENT_USER.id, lawyerId: LAWYER_USER.id },
          sender: expect.objectContaining({ id: CLIENT_USER.id, role: 'CLIENT' }),
        }),
      );
    });

    it("the lawyer's reply is addressed to the client", async () => {
      await service.send('case-1', { body: 'Маргааш уулзъя' }, LAWYER_USER);
      expect(events.emitAsync.mock.calls[0][1]).toMatchObject({ recipientId: CLIENT_USER.id });
    });

    it('an ADMIN message is addressed to the client', async () => {
      await service.send('case-1', { body: 'Оффисын хаяг солигдлоо' }, ADMIN_USER);
      expect(events.emitAsync.mock.calls[0][1]).toMatchObject({ recipientId: CLIENT_USER.id });
    });
  });

  describe('pagination', () => {
    it('returns the newest page and a cursor when older messages exist', async () => {
      prisma.message.findMany.mockResolvedValue([row('m5', 1), row('m4', 2), row('m3', 3)]);

      const page = await service.list('case-1', { limit: 2 }, LAWYER_USER);

      expect(prisma.message.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { caseId: 'case-1' }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 3 }),
      );
      expect(page.items.map((item) => item.id)).toEqual(['m5', 'm4']);
      expect(page.nextCursor).toBe('m4');
    });

    it('continues after the cursor and reports the last page', async () => {
      prisma.message.findMany.mockResolvedValue([row('m3', 3)]);

      const page = await service.list('case-1', { limit: 2, cursor: '3f1c2b6e-8a4d-4c1e-9b2f-5d6e7a8b9c0d' }, CLIENT_USER);

      expect(prisma.message.findMany.mock.calls[0][0]).toMatchObject({ cursor: { id: '3f1c2b6e-8a4d-4c1e-9b2f-5d6e7a8b9c0d' }, skip: 1 });
      expect(page).toEqual({ items: [expect.objectContaining({ id: 'm3' })], nextCursor: null });
    });
  });

  describe('unread', () => {
    it('a CLIENT counts only unread messages written by the staff', async () => {
      prisma.message.count.mockResolvedValue(2);
      await expect(service.unreadCount('case-1', CLIENT_USER)).resolves.toEqual({ count: 2 });
      expect(prisma.message.count).toHaveBeenCalledWith({
        where: { caseId: 'case-1', readAt: null, senderId: { not: CLIENT_USER.id }, case: { clientId: CLIENT_USER.id } },
      });
    });

    it("the lawyer opening the thread marks the client's messages read and the count drops to 0", async () => {
      prisma.message.count.mockResolvedValueOnce(3).mockResolvedValueOnce(0);
      prisma.message.updateMany.mockResolvedValue({ count: 3 });

      await expect(service.unreadCount('case-1', LAWYER_USER)).resolves.toEqual({ count: 3 });
      await expect(service.markRead('case-1', LAWYER_USER)).resolves.toEqual({ updated: 3 });
      await expect(service.unreadCount('case-1', LAWYER_USER)).resolves.toEqual({ count: 0 });

      expect(prisma.message.updateMany).toHaveBeenCalledWith({
        where: { caseId: 'case-1', readAt: null, sender: { role: 'CLIENT' }, case: { lawyerId: LAWYER_USER.id } },
        data: { readAt: expect.any(Date) },
      });
    });

    it('ADMIN only views: nothing is unread for them and opening a thread marks nothing', async () => {
      await expect(service.unreadCount('case-1', ADMIN_USER)).resolves.toEqual({ count: 0 });
      await expect(service.markRead('case-1', ADMIN_USER)).resolves.toEqual({ updated: 0 });
      expect(prisma.message.updateMany).not.toHaveBeenCalled();
      await expect(service.unreadSummary(ADMIN_USER)).resolves.toEqual({ total: 0, cases: [] });
    });

    it("the unread summary groups a client's unread messages per case", async () => {
      prisma.message.groupBy.mockResolvedValue([
        { caseId: 'case-2', _count: { _all: 1 } },
        { caseId: 'case-1', _count: { _all: 3 } },
      ]);
      prisma.case.findMany.mockResolvedValue([
        { id: 'case-1', caseNumber: 'LF-2026-0001', title: 'Түрээсийн маргаан' },
        { id: 'case-2', caseNumber: 'LF-2026-0003', title: 'Хөдөлмөрийн маргаан' },
      ]);

      await expect(service.unreadSummary(CLIENT_USER)).resolves.toEqual({
        total: 4,
        cases: [
          { caseId: 'case-1', caseNumber: 'LF-2026-0001', title: 'Түрээсийн маргаан', count: 3 },
          { caseId: 'case-2', caseNumber: 'LF-2026-0003', title: 'Хөдөлмөрийн маргаан', count: 1 },
        ],
      });
    });

    it('conversations are sorted by the latest message and carry unread counts', async () => {
      prisma.case.findMany.mockResolvedValue([
        { id: 'case-1', caseNumber: 'LF-2026-0001', title: 'A', status: 'IN_PROGRESS', client: person(CLIENT_USER), lawyer: person(LAWYER_USER), messages: [row('old', 60)] },
        { id: 'case-3', caseNumber: 'LF-2026-0003', title: 'B', status: 'CLOSED', client: person(CLIENT_USER), lawyer: person(LAWYER_USER), messages: [row('new', 1, LAWYER_USER)] },
      ]);
      prisma.message.groupBy.mockResolvedValue([{ caseId: 'case-3', _count: { _all: 1 } }]);

      const list = await service.conversations(CLIENT_USER);

      expect(prisma.case.findMany.mock.calls[0][0].where).toEqual({ messages: { some: {} }, clientId: CLIENT_USER.id });
      expect(list.map((item) => [item.id, item.lastMessage?.id, item.unreadCount])).toEqual([
        ['case-3', 'new', 1],
        ['case-1', 'old', 0],
      ]);
    });
  });
});
