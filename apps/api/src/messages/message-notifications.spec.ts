import { EventEmitterModule } from '@nestjs/event-emitter';
import { Test, type TestingModule } from '@nestjs/testing';
import { CasesService } from '../cases/cases.service';
import { ADMIN_USER, CLIENT_USER, LAWYER_USER, createPrismaMock, type PrismaMock } from '../common/testing/mocks';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { MessageNotificationsListener } from './message-notifications.listener';
import { MessagesService } from './messages.service';

const caseRecord = { id: 'case-1', caseNumber: 'LF-2026-0001', title: 'Түрээсийн маргаан', clientId: CLIENT_USER.id, lawyerId: LAWYER_USER.id, status: 'IN_PROGRESS' };
const PEOPLE: Record<string, { firstName: string; lastName: string; role: string }> = {
  [CLIENT_USER.id]: { firstName: 'Ганбат', lastName: 'Сүх', role: 'CLIENT' },
  [LAWYER_USER.id]: { firstName: 'Энхжаргал', lastName: 'Бат', role: 'LAWYER' },
  [ADMIN_USER.id]: { firstName: 'Батболд', lastName: 'Дорж', role: 'ADMIN' },
};

describe('message.sent → notifications (EventEmitter2 wiring, dedup)', () => {
  let moduleRef: TestingModule;
  let service: MessagesService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = createPrismaMock();
    moduleRef = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot()],
      providers: [
        MessagesService,
        MessageNotificationsListener,
        CasesService,
        NotificationsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    await moduleRef.init();
    service = moduleRef.get(MessagesService);

    prisma.case.findUnique.mockResolvedValue(caseRecord);
    prisma.message.create.mockImplementation(async ({ data }: any) => ({
      id: 'msg-1',
      caseId: data.caseId,
      body: data.body,
      readAt: null,
      createdAt: new Date('2026-09-15T03:00:00Z'),
      sender: { id: data.senderId, avatarUrl: null, ...PEOPLE[data.senderId] },
    }));
    prisma.notification.findFirst.mockResolvedValue(null);
    prisma.notification.createMany.mockResolvedValue({ count: 1 });
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  const created = () => prisma.notification.createMany.mock.calls.map(([arg]: any) => arg.data[0]);

  it('a CLIENT message notifies the assigned lawyer with a link to the admin chat tab', async () => {
    await service.send('case-1', { body: 'Сайн байна уу,   эвлэрлийн\nсанал ирлээ' }, CLIENT_USER);
    expect(created()).toEqual([
      {
        userId: LAWYER_USER.id,
        type: 'MESSAGE',
        title: 'Шинэ мессеж: LF-2026-0001',
        body: 'С. Ганбат: Сайн байна уу, эвлэрлийн санал ирлээ',
        link: '/admin/cases/case-1?tab=messages',
        actorId: CLIENT_USER.id,
      },
    ]);
  });

  it("the lawyer's reply notifies the client with a link to the portal chat tab", async () => {
    await service.send('case-1', { body: 'Маргааш 10 цагт уулзъя' }, LAWYER_USER);
    expect(created()).toEqual([
      expect.objectContaining({ userId: CLIENT_USER.id, body: 'Б. Энхжаргал: Маргааш 10 цагт уулзъя', link: '/portal/cases/case-1?tab=messages' }),
    ]);
  });

  it('no duplicate while the previous message notification for the thread is still unread', async () => {
    prisma.notification.findFirst.mockResolvedValue({ id: 'n-1' });
    await service.send('case-1', { body: 'Бас нэг асуулт' }, CLIENT_USER);
    expect(prisma.notification.findFirst).toHaveBeenCalledWith({
      where: { userId: LAWYER_USER.id, type: 'MESSAGE', link: '/admin/cases/case-1?tab=messages', isRead: false },
      select: { id: true },
    });
    expect(prisma.notification.createMany).not.toHaveBeenCalled();
  });

  it('once the previous notification was read, the next message notifies again', async () => {
    await service.send('case-1', { body: 'Нэг' }, CLIENT_USER);
    prisma.notification.findFirst.mockResolvedValueOnce({ id: 'n-1' });
    await service.send('case-1', { body: 'Хоёр' }, CLIENT_USER);
    await service.send('case-1', { body: 'Гурав (уншсаны дараа)' }, CLIENT_USER);
    expect(created().map((item: any) => item.body)).toEqual(['С. Ганбат: Нэг', 'С. Ганбат: Гурав (уншсаны дараа)']);
  });

  it('a failing notification insert does not fail sending the message', async () => {
    prisma.notification.createMany.mockRejectedValue(new Error('db down'));
    await expect(service.send('case-1', { body: 'Сайн уу' }, CLIENT_USER)).resolves.toMatchObject({ id: 'msg-1' });
  });
});
