import { EventEmitterModule } from '@nestjs/event-emitter';
import { Test, type TestingModule } from '@nestjs/testing';
import { CasesService } from '../cases/cases.service';
import { ADMIN_USER, CLIENT_USER, LAWYER_USER, createPrismaMock, type PrismaMock } from '../common/testing/mocks';
import type { RequestUser } from '../common/types/request-user';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { TaskNotificationsListener } from './task-notifications.listener';
import { TasksService } from './tasks.service';

const MEMBER_LAWYER: RequestUser = { id: 'member-lawyer-id', email: 'member@lawfirm.mn', role: 'LAWYER' };
const members = [
  { userId: LAWYER_USER.id, role: 'LEAD' },
  { userId: MEMBER_LAWYER.id, role: 'MEMBER' },
];
const accessRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'task-1',
  title: 'Тайлбар бэлтгэх',
  status: 'TODO',
  assigneeId: MEMBER_LAWYER.id,
  createdById: LAWYER_USER.id,
  caseId: 'case-1',
  case: { caseNumber: 'LF-2026-0001', clientId: CLIENT_USER.id, lawyerId: LAWYER_USER.id, members },
  ...overrides,
});

describe('Task events → notifications (EventEmitter2 wiring)', () => {
  let moduleRef: TestingModule;
  let service: TasksService;
  let prisma: PrismaMock;
  let notifications: { createMany: jest.Mock };

  beforeEach(async () => {
    prisma = createPrismaMock();
    notifications = { createMany: jest.fn().mockResolvedValue({ count: 1 }) };
    moduleRef = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot()],
      providers: [
        TasksService,
        CasesService,
        TaskNotificationsListener,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: notifications },
      ],
    }).compile();
    await moduleRef.init();
    service = moduleRef.get(TasksService);
    prisma.case.findUnique.mockResolvedValue({ id: 'case-1', caseNumber: 'LF-2026-0001', title: 'Маргаан', clientId: CLIENT_USER.id, lawyerId: LAWYER_USER.id, status: 'NEW', members });
    prisma.user.findUnique.mockImplementation(async ({ where }: any) => ({ id: where.id, role: where.id === ADMIN_USER.id ? 'ADMIN' : 'LAWYER', isActive: true }));
    prisma.task.create.mockImplementation(async ({ data }: any) => ({ id: 'task-1', ...data, case: data.caseId ? { caseNumber: 'LF-2026-0001' } : null }));
    prisma.task.update.mockImplementation(async ({ data }: any) => ({ ...accessRow(), ...data }));
    prisma.taskComment.create.mockResolvedValue({ id: 'comment-1' });
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  const sent = () => notifications.createMany.mock.calls.flatMap(([inputs]) => inputs);

  it('task.assigned → the assignee is notified; assigning yourself sends nothing', async () => {
    await service.create({ title: 'Нотлох баримт цуглуулах', caseId: 'case-1', assigneeId: MEMBER_LAWYER.id, priority: 'HIGH' }, LAWYER_USER);
    expect(sent()).toEqual([
      { userId: MEMBER_LAWYER.id, type: 'TASK', title: 'Танд даалгавар оноолоо: Нотлох баримт цуглуулах', body: 'LF-2026-0001', link: '/admin/tasks/task-1', actorId: LAWYER_USER.id },
    ]);

    notifications.createMany.mockClear();
    await service.create({ title: 'Өөртөө', assigneeId: LAWYER_USER.id, priority: 'LOW' }, LAWYER_USER);
    expect(notifications.createMany).not.toHaveBeenCalled();
  });

  it('task.status-changed → creator and assignee, except the person who changed it', async () => {
    prisma.task.findUnique.mockResolvedValue(accessRow());
    await service.update('task-1', { status: 'IN_PROGRESS' }, MEMBER_LAWYER);
    expect(sent()).toEqual([
      expect.objectContaining({ userId: LAWYER_USER.id, title: 'Даалгавар «Хийгдэж буй» боллоо: Тайлбар бэлтгэх', link: '/admin/tasks/task-1' }),
    ]);

    notifications.createMany.mockClear();
    prisma.task.findUnique.mockResolvedValue(accessRow({ status: 'IN_PROGRESS' }));
    await service.update('task-1', { status: 'REVIEW' }, ADMIN_USER);
    expect(sent().map((item: any) => item.userId).sort()).toEqual([LAWYER_USER.id, MEMBER_LAWYER.id].sort());
  });

  it('task.commented → assignee and creator except the author, once even when they are the same person', async () => {
    prisma.task.findUnique.mockResolvedValue(accessRow());
    await service.addComment('task-1', { body: 'Гэрээг хавсаргалаа' }, MEMBER_LAWYER);
    expect(sent()).toEqual([expect.objectContaining({ userId: LAWYER_USER.id, title: 'Даалгаварт коммент: Тайлбар бэлтгэх', body: 'Гэрээг хавсаргалаа' })]);

    notifications.createMany.mockClear();
    prisma.task.findUnique.mockResolvedValue(accessRow({ assigneeId: LAWYER_USER.id, createdById: LAWYER_USER.id }));
    await service.addComment('task-1', { body: 'Админы санал' }, ADMIN_USER);
    expect(sent().map((item: any) => item.userId)).toEqual([LAWYER_USER.id]);
  });
});
