import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { LAWYER_USER, OTHER_LAWYER, createPrismaMock, type PrismaMock } from '../common/testing/mocks';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { CaseEventsService } from './case-events.service';
import { CasesService } from './cases.service';

describe('CaseEventsService', () => {
  let service: CaseEventsService;
  let prisma: PrismaMock;
  let notifications: { createMany: jest.Mock };

  const caseRecord = { id: 'case-1', caseNumber: 'LF-2026-0001', title: 'Маргаан', clientId: 'client-id', lawyerId: LAWYER_USER.id, status: 'IN_PROGRESS' };
  const eventInput = (overrides: Record<string, unknown> = {}) => ({
    type: 'HEARING' as const,
    title: 'Шүүх хурал',
    description: 'Танхим №3',
    eventDate: new Date('2026-09-24T02:00:00Z'),
    isVisibleToClient: true,
    ...overrides,
  });

  beforeEach(() => {
    prisma = createPrismaMock();
    notifications = { createMany: jest.fn().mockResolvedValue({ count: 1 }) };
    const cases = new CasesService(prisma as unknown as PrismaService);
    service = new CaseEventsService(prisma as unknown as PrismaService, cases, notifications as unknown as NotificationsService);
    prisma.case.findUnique.mockResolvedValue(caseRecord);
    prisma.caseEvent.create.mockImplementation(async ({ data }: any) => ({ id: 'event-1', ...data }));
  });

  it('LAWYER adding an event to a case they do not handle → 403, nothing written', async () => {
    await expect(service.create('case-1', eventInput(), OTHER_LAWYER)).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.caseEvent.create).not.toHaveBeenCalled();
    expect(notifications.createMany).not.toHaveBeenCalled();
  });

  it('a visible HEARING notifies the client with a link to the case', async () => {
    await service.create('case-1', eventInput(), LAWYER_USER);
    expect(prisma.caseEvent.create.mock.calls[0][0].data).toMatchObject({ caseId: 'case-1', createdById: LAWYER_USER.id, type: 'HEARING' });
    expect(notifications.createMany).toHaveBeenCalledWith([
      expect.objectContaining({ userId: 'client-id', type: 'CASE_EVENT', link: '/portal/cases/case-1', body: 'LF-2026-0001 · 2026.09.24 10:00' }),
    ]);
  });

  it.each(['MEETING', 'DEADLINE'] as const)('a visible %s also notifies the client', async (type) => {
    await service.create('case-1', eventInput({ type }), LAWYER_USER);
    expect(notifications.createMany).toHaveBeenCalledTimes(1);
  });

  it('a NOTE never notifies the client', async () => {
    await service.create('case-1', eventInput({ type: 'NOTE' }), LAWYER_USER);
    expect(notifications.createMany).not.toHaveBeenCalled();
  });

  it('a hidden DEADLINE does not notify the client', async () => {
    await service.create('case-1', eventInput({ type: 'DEADLINE', isVisibleToClient: false }), LAWYER_USER);
    expect(notifications.createMany).not.toHaveBeenCalled();
  });

  it('updating an event on someone else\'s case → 403', async () => {
    prisma.caseEvent.findUnique.mockResolvedValue({ id: 'event-1', type: 'NOTE', case: { lawyerId: LAWYER_USER.id, clientId: 'client-id' } });
    await expect(service.update('event-1', { title: 'Өөрчилсөн' }, OTHER_LAWYER)).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.caseEvent.update).not.toHaveBeenCalled();
  });

  it('the type of a STATUS_CHANGE entry cannot be changed → 400', async () => {
    prisma.caseEvent.findUnique.mockResolvedValue({ id: 'event-1', type: 'STATUS_CHANGE', case: { lawyerId: LAWYER_USER.id, clientId: 'client-id' } });
    await expect(service.update('event-1', { type: 'NOTE' }, LAWYER_USER)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('the assigned lawyer can delete an event', async () => {
    prisma.caseEvent.findUnique.mockResolvedValue({ id: 'event-1', type: 'NOTE', case: { lawyerId: LAWYER_USER.id, clientId: 'client-id' } });
    await service.remove('event-1', LAWYER_USER);
    expect(prisma.caseEvent.delete).toHaveBeenCalledWith({ where: { id: 'event-1' } });
  });
});
