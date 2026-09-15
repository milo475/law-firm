import { BadRequestException, ForbiddenException } from '@nestjs/common';
import type { EventEmitter2 } from '@nestjs/event-emitter';
import { CasesService } from '../cases/cases.service';
import { ADMIN_USER, CLIENT_USER, LAWYER_USER, OTHER_LAWYER, createPrismaMock, type PrismaMock } from '../common/testing/mocks';
import type { RequestUser } from '../common/types/request-user';
import { PrismaService } from '../prisma/prisma.service';
import { TASK_EVENTS } from './task.events';
import { TasksService } from './tasks.service';

const MEMBER_LAWYER: RequestUser = { id: 'member-lawyer-id', email: 'member@lawfirm.mn', role: 'LAWYER' };
const teamCase = {
  id: 'case-1',
  caseNumber: 'LF-2026-0001',
  title: 'Маргаан',
  clientId: CLIENT_USER.id,
  lawyerId: LAWYER_USER.id,
  status: 'IN_PROGRESS',
  members: [
    { userId: LAWYER_USER.id, role: 'LEAD' },
    { userId: MEMBER_LAWYER.id, role: 'MEMBER' },
  ],
};
const STAFF: Record<string, { id: string; role: string; isActive: boolean }> = {
  [LAWYER_USER.id]: { id: LAWYER_USER.id, role: 'LAWYER', isActive: true },
  [MEMBER_LAWYER.id]: { id: MEMBER_LAWYER.id, role: 'LAWYER', isActive: true },
  [OTHER_LAWYER.id]: { id: OTHER_LAWYER.id, role: 'LAWYER', isActive: true },
  [ADMIN_USER.id]: { id: ADMIN_USER.id, role: 'ADMIN', isActive: true },
  [CLIENT_USER.id]: { id: CLIENT_USER.id, role: 'CLIENT', isActive: true },
};
const accessRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'task-1',
  title: 'Тайлбар бэлтгэх',
  status: 'TODO',
  assigneeId: MEMBER_LAWYER.id,
  createdById: LAWYER_USER.id,
  caseId: 'case-1',
  case: { caseNumber: 'LF-2026-0001', clientId: CLIENT_USER.id, lawyerId: LAWYER_USER.id, members: teamCase.members },
  ...overrides,
});
const internalRow = (overrides: Record<string, unknown> = {}) => accessRow({ caseId: null, case: null, assigneeId: LAWYER_USER.id, createdById: LAWYER_USER.id, ...overrides });

describe('TasksService', () => {
  let prisma: PrismaMock;
  let events: { emitAsync: jest.Mock };
  let service: TasksService;

  beforeEach(() => {
    prisma = createPrismaMock();
    events = { emitAsync: jest.fn().mockResolvedValue([]) };
    service = new TasksService(prisma as unknown as PrismaService, new CasesService(prisma as unknown as PrismaService), events as unknown as EventEmitter2);
    prisma.case.findUnique.mockResolvedValue(teamCase);
    prisma.user.findUnique.mockImplementation(async ({ where }: any) => STAFF[where.id] ?? null);
    prisma.task.create.mockImplementation(async ({ data }: any) => ({ id: 'task-new', ...data, case: data.caseId ? { caseNumber: 'LF-2026-0001' } : null }));
    prisma.task.update.mockImplementation(async ({ data }: any) => ({ ...accessRow(), ...data }));
    prisma.task.findMany.mockResolvedValue([]);
    prisma.task.count.mockResolvedValue(0);
  });

  describe('create', () => {
    it('a LAWYER outside the case team cannot create a task on it → 403', async () => {
      await expect(service.create({ title: 'Даалгавар', caseId: 'case-1', assigneeId: OTHER_LAWYER.id, priority: 'MEDIUM' }, OTHER_LAWYER)).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.task.create).not.toHaveBeenCalled();
    });

    it('a team member assigns a teammate; task.assigned is emitted', async () => {
      await service.create({ title: 'Нотлох баримт цуглуулах', caseId: 'case-1', assigneeId: LAWYER_USER.id, priority: 'HIGH' }, MEMBER_LAWYER);
      expect(prisma.task.create.mock.calls[0][0].data).toMatchObject({ caseId: 'case-1', assigneeId: LAWYER_USER.id, createdById: MEMBER_LAWYER.id, priority: 'HIGH' });
      expect(events.emitAsync).toHaveBeenCalledWith(TASK_EVENTS.assigned, { task: expect.objectContaining({ assigneeId: LAWYER_USER.id, caseNumber: 'LF-2026-0001' }), actorId: MEMBER_LAWYER.id });
    });

    it('on a case, a LAWYER cannot assign someone outside the team → 400', async () => {
      await expect(service.create({ title: 'Даалгавар', caseId: 'case-1', assigneeId: OTHER_LAWYER.id, priority: 'MEDIUM' }, LAWYER_USER)).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.task.create).not.toHaveBeenCalled();
    });

    it('ADMIN may assign anyone, even outside the case team', async () => {
      await service.create({ title: 'Даалгавар', caseId: 'case-1', assigneeId: OTHER_LAWYER.id, priority: 'LOW' }, ADMIN_USER);
      expect(prisma.task.create).toHaveBeenCalledTimes(1);
    });

    it('a LAWYER creates internal tasks only for themselves', async () => {
      await service.create({ title: 'Сургалтад бүртгүүлэх', assigneeId: LAWYER_USER.id, priority: 'LOW' }, LAWYER_USER);
      expect(prisma.task.create.mock.calls[0][0].data).toMatchObject({ caseId: null, assigneeId: LAWYER_USER.id });
      await expect(service.create({ title: 'Бусдад', assigneeId: OTHER_LAWYER.id, priority: 'LOW' }, LAWYER_USER)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('the assignee must be active staff → 400 for a client', async () => {
      await expect(service.create({ title: 'Даалгавар', assigneeId: CLIENT_USER.id, priority: 'LOW' }, ADMIN_USER)).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('visibility', () => {
    it('a LAWYER lists tasks assigned to them, created by them or on their team cases; filters narrow it', async () => {
      await service.findAll({ page: 1, limit: 20, sort: 'dueDate', status: 'TODO', overdue: true }, LAWYER_USER);
      const where = prisma.task.findMany.mock.calls[0][0].where;
      expect(where.AND[0]).toEqual({ OR: [{ assigneeId: LAWYER_USER.id }, { createdById: LAWYER_USER.id }, { case: { members: { some: { userId: LAWYER_USER.id } } } }] });
      expect(where.AND).toEqual(expect.arrayContaining([{ status: 'TODO' }, { dueDate: { lt: expect.any(Date) }, status: { in: ['TODO', 'IN_PROGRESS', 'REVIEW'] } }]));
    });

    it('ADMIN lists everything; a CLIENT never sees tasks → 403', async () => {
      await service.findAll({ page: 1, limit: 20, sort: 'priority', scope: 'mine' }, ADMIN_USER);
      expect(prisma.task.findMany.mock.calls[0][0].where.AND).toEqual([{}, { assigneeId: ADMIN_USER.id }]);
      expect(prisma.task.findMany.mock.calls[0][0].orderBy[0]).toEqual({ priority: 'desc' });
      await expect(service.findAll({ page: 1, limit: 20, sort: 'dueDate' }, CLIENT_USER)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('a LAWYER unrelated to an internal task cannot open it → 403; the assignee can', async () => {
      prisma.task.findUnique.mockResolvedValue({ ...internalRow(), comments: [] });
      await expect(service.findOne('task-1', OTHER_LAWYER)).rejects.toBeInstanceOf(ForbiddenException);
      await expect(service.findOne('task-1', LAWYER_USER)).resolves.toMatchObject({ id: 'task-1', permissions: { canEdit: true, canChangeStatus: true } });
    });

    it('a team member who is neither assignee nor creator can open a case task but only read it', async () => {
      prisma.task.findUnique.mockResolvedValue({ ...accessRow({ assigneeId: LAWYER_USER.id, createdById: ADMIN_USER.id }), case: { ...teamCase }, comments: [] });
      const task = await service.findOne('task-1', MEMBER_LAWYER);
      expect(task.permissions).toEqual({ canEdit: false, canDelete: false, canChangeStatus: false });
      expect(task.case).toEqual({ id: 'case-1', caseNumber: 'LF-2026-0001', title: 'Маргаан' });
    });
  });

  describe('update', () => {
    it('the assignee moves TODO → IN_PROGRESS; status-changed is emitted', async () => {
      prisma.task.findUnique.mockResolvedValue(accessRow());
      await service.update('task-1', { status: 'IN_PROGRESS' }, MEMBER_LAWYER);
      expect(prisma.task.update.mock.calls[0][0].data).toEqual({ status: 'IN_PROGRESS', completedAt: null });
      expect(events.emitAsync).toHaveBeenCalledWith(TASK_EVENTS.statusChanged, expect.objectContaining({ from: 'TODO', to: 'IN_PROGRESS', actorId: MEMBER_LAWYER.id }));
    });

    it('REVIEW → DONE sets completedAt', async () => {
      prisma.task.findUnique.mockResolvedValue(accessRow({ status: 'REVIEW' }));
      await service.update('task-1', { status: 'DONE' }, MEMBER_LAWYER);
      expect(prisma.task.update.mock.calls[0][0].data).toEqual({ status: 'DONE', completedAt: expect.any(Date) });
    });

    it.each([
      ['TODO', 'DONE'],
      ['IN_PROGRESS', 'DONE'],
      ['CANCELLED', 'TODO'],
    ])('an invalid transition %s → %s → 400', async (from, to) => {
      prisma.task.findUnique.mockResolvedValue(accessRow({ status: from }));
      await expect(service.update('task-1', { status: to as never }, ADMIN_USER)).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.task.update).not.toHaveBeenCalled();
    });

    it('a team member who is not assignee or creator cannot change the status → 403', async () => {
      prisma.task.findUnique.mockResolvedValue(accessRow({ assigneeId: LAWYER_USER.id, createdById: ADMIN_USER.id }));
      await expect(service.update('task-1', { status: 'IN_PROGRESS' }, MEMBER_LAWYER)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('the assignee cannot edit the details → 403', async () => {
      prisma.task.findUnique.mockResolvedValue(accessRow());
      await expect(service.update('task-1', { title: 'Өөр гарчиг' }, MEMBER_LAWYER)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('the creator reassigns to another team member; the new assignee gets task.assigned', async () => {
      prisma.task.findUnique.mockResolvedValue(accessRow({ assigneeId: MEMBER_LAWYER.id }));
      await service.update('task-1', { assigneeId: LAWYER_USER.id, priority: 'URGENT' }, LAWYER_USER);
      expect(prisma.task.update.mock.calls[0][0].data).toEqual({ priority: 'URGENT', assigneeId: LAWYER_USER.id });
      expect(events.emitAsync).toHaveBeenCalledWith(TASK_EVENTS.assigned, expect.objectContaining({ actorId: LAWYER_USER.id }));
    });

    it('ADMIN edits any task', async () => {
      prisma.task.findUnique.mockResolvedValue(internalRow({ assigneeId: OTHER_LAWYER.id, createdById: OTHER_LAWYER.id }));
      await service.update('task-1', { title: 'Админ зассан', status: 'IN_PROGRESS' }, ADMIN_USER);
      expect(prisma.task.update).toHaveBeenCalledTimes(1);
    });
  });

  describe('delete and comments', () => {
    it('a LAWYER who did not create the task cannot delete it → 403; the creator and ADMIN can', async () => {
      prisma.task.findUnique.mockResolvedValue(accessRow());
      await expect(service.remove('task-1', MEMBER_LAWYER)).rejects.toBeInstanceOf(ForbiddenException);
      await service.remove('task-1', LAWYER_USER);
      await service.remove('task-1', ADMIN_USER);
      expect(prisma.task.delete).toHaveBeenCalledTimes(2);
    });

    it('anyone who can see the task comments on it; an outsider cannot → 403', async () => {
      prisma.task.findUnique.mockResolvedValue(accessRow());
      prisma.taskComment.create.mockImplementation(async ({ data }: any) => ({ id: 'c-1', ...data }));
      await service.addComment('task-1', { body: 'Гэрээний хуулбарыг хавсаргалаа' }, MEMBER_LAWYER);
      expect(events.emitAsync).toHaveBeenCalledWith(TASK_EVENTS.commented, expect.objectContaining({ authorId: MEMBER_LAWYER.id, body: 'Гэрээний хуулбарыг хавсаргалаа' }));
      await expect(service.addComment('task-1', { body: 'Хөндлөнгийн' }, OTHER_LAWYER)).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  it('my-summary counts the active tasks assigned to me per status and the overdue ones', async () => {
    prisma.task.groupBy.mockResolvedValue([
      { status: 'TODO', _count: { _all: 2 } },
      { status: 'REVIEW', _count: { _all: 1 } },
    ]);
    prisma.task.count.mockResolvedValue(1);
    await expect(service.mySummary(LAWYER_USER)).resolves.toEqual({ active: 3, overdue: 1, byStatus: { TODO: 2, IN_PROGRESS: 0, REVIEW: 1 } });
    expect(prisma.task.count.mock.calls[0][0].where).toEqual({ assigneeId: LAWYER_USER.id, status: { in: ['TODO', 'IN_PROGRESS', 'REVIEW'] }, dueDate: { lt: expect.any(Date) } });
  });
});
