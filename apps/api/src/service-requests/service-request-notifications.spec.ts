import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { Test, type TestingModule } from '@nestjs/testing';
import { ADMIN_USER, CLIENT_USER, LAWYER_USER, OTHER_LAWYER, createPrismaMock, type PrismaMock } from '../common/testing/mocks';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { ServiceRequestNotificationsListener } from './service-request-notifications.listener';

const request = { id: 'sr-1', title: 'Түрээсийн гэрээний маргаан', type: 'LAWYER' as const, requesterId: CLIENT_USER.id, requesterName: 'С. Ганбат' };

describe('service request events → notifications (EventEmitter2 wiring)', () => {
  let moduleRef: TestingModule;
  let emitter: EventEmitter2;
  let prisma: PrismaMock;
  let notifications: { createMany: jest.Mock };

  beforeEach(async () => {
    prisma = createPrismaMock();
    notifications = { createMany: jest.fn().mockResolvedValue({ count: 1 }) };
    moduleRef = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot()],
      providers: [
        ServiceRequestNotificationsListener,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: notifications },
      ],
    }).compile();
    await moduleRef.init();
    emitter = moduleRef.get(EventEmitter2);
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  it('a new request notifies every active admin with a link to the request', async () => {
    prisma.user.findMany.mockResolvedValue([{ id: 'admin-1' }, { id: 'admin-2' }]);

    await emitter.emitAsync('service-request.created', { request });

    expect(prisma.user.findMany).toHaveBeenCalledWith({ where: { role: 'ADMIN', isActive: true }, select: { id: true } });
    const expected = (userId: string) => ({
      userId,
      type: 'SERVICE_REQUEST',
      title: 'Шинэ үйлчилгээний хүсэлт: Түрээсийн гэрээний маргаан',
      body: 'С. Ганбат · Өмгөөлөгч авах',
      link: '/admin/requests/sr-1',
      actorId: CLIENT_USER.id,
    });
    expect(notifications.createMany).toHaveBeenCalledWith([expected('admin-1'), expected('admin-2')]);
  });

  it('accepting tells the requester', async () => {
    await emitter.emitAsync('service-request.accepted', { request, actorId: ADMIN_USER.id });
    expect(notifications.createMany).toHaveBeenCalledWith([
      expect.objectContaining({ userId: CLIENT_USER.id, title: 'Таны хүсэлтийг хүлээж авлаа', link: '/portal/requests', actorId: ADMIN_USER.id }),
    ]);
  });

  it('rejecting tells the requester the reason', async () => {
    await emitter.emitAsync('service-request.rejected', { request, actorId: ADMIN_USER.id, reason: 'Манай чиглэл биш' });
    expect(notifications.createMany).toHaveBeenCalledWith([
      expect.objectContaining({ userId: CLIENT_USER.id, title: 'Таны хүсэлтийг татгалзлаа', body: 'Түрээсийн гэрээний маргаан · Шалтгаан: Манай чиглэл биш' }),
    ]);
  });

  it('assigning tells the lead, each member and the requester, each with their own link', async () => {
    const caseRef = { id: 'case-9', caseNumber: 'LF-2026-0009', title: 'Түрээсийн гэрээний маргаан' };

    await emitter.emitAsync('service-request.assigned', { request, actorId: ADMIN_USER.id, caseRef, leadId: LAWYER_USER.id, memberIds: [OTHER_LAWYER.id] });

    expect(notifications.createMany).toHaveBeenCalledWith([
      {
        userId: LAWYER_USER.id,
        type: 'SERVICE_REQUEST',
        title: 'Танд шинэ хэрэг хуваарилагдлаа: LF-2026-0009',
        body: 'Түрээсийн гэрээний маргаан · ахлах өмгөөлөгчөөр',
        link: '/admin/cases/case-9',
        actorId: ADMIN_USER.id,
      },
      {
        userId: OTHER_LAWYER.id,
        type: 'SERVICE_REQUEST',
        title: 'Танд шинэ хэрэг хуваарилагдлаа: LF-2026-0009',
        body: 'Түрээсийн гэрээний маргаан',
        link: '/admin/cases/case-9',
        actorId: ADMIN_USER.id,
      },
      {
        userId: CLIENT_USER.id,
        type: 'SERVICE_REQUEST',
        title: 'Таны хүсэлтэд өмгөөлөгч томилогдлоо, хэрэг нээгдлээ',
        body: 'LF-2026-0009 · Түрээсийн гэрээний маргаан',
        link: '/portal/cases/case-9',
        actorId: ADMIN_USER.id,
      },
    ]);
  });

  it('a failing notification never breaks the request flow', async () => {
    notifications.createMany.mockRejectedValue(new Error('db down'));
    await expect(emitter.emitAsync('service-request.rejected', { request, actorId: ADMIN_USER.id, reason: 'Шалтгаан' })).resolves.toBeDefined();
  });
});
