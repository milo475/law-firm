import { EventEmitterModule } from '@nestjs/event-emitter';
import { Test, type TestingModule } from '@nestjs/testing';
import { ADMIN_USER, CLIENT_USER, LAWYER_USER, createPrismaMock, type PrismaMock } from '../common/testing/mocks';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { CaseMemberNotificationsListener } from './case-member-notifications.listener';
import { CaseMembersService } from './case-members.service';
import { CasesService } from './cases.service';

describe('case.member-added → notification (EventEmitter2 wiring)', () => {
  let moduleRef: TestingModule;
  let service: CaseMembersService;
  let prisma: PrismaMock;
  let notifications: { createMany: jest.Mock };

  beforeEach(async () => {
    prisma = createPrismaMock();
    notifications = { createMany: jest.fn().mockResolvedValue({ count: 1 }) };
    moduleRef = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot()],
      providers: [
        CaseMembersService,
        CasesService,
        CaseMemberNotificationsListener,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: notifications },
      ],
    }).compile();
    await moduleRef.init();
    service = moduleRef.get(CaseMembersService);
    prisma.case.findUnique.mockResolvedValue({
      id: 'case-1', caseNumber: 'LF-2026-0001', title: 'Түрээсийн маргаан', clientId: CLIENT_USER.id, lawyerId: LAWYER_USER.id, status: 'NEW',
      members: [{ userId: LAWYER_USER.id, role: 'LEAD' }],
    });
    prisma.caseMember.findUnique.mockResolvedValue(null);
    prisma.caseMember.create.mockImplementation(async ({ data }: any) => ({ id: 'row', ...data }));
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  it('the added staff member is told which case team they joined', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'new-lawyer-id', role: 'LAWYER', isActive: true });
    await service.add('case-1', { userId: 'new-lawyer-id', role: 'MEMBER' }, LAWYER_USER);
    expect(notifications.createMany).toHaveBeenCalledWith([
      { userId: 'new-lawyer-id', type: 'CASE_MEMBER', title: 'Танийг LF-2026-0001 багт нэмлээ', body: 'Түрээсийн маргаан', link: '/admin/cases/case-1' },
    ]);
  });

  it('an admin adding themselves gets no notification', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: ADMIN_USER.id, role: 'ADMIN', isActive: true });
    await service.add('case-1', { userId: ADMIN_USER.id, role: 'MEMBER' }, ADMIN_USER);
    expect(notifications.createMany).not.toHaveBeenCalled();
  });
});
