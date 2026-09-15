import { BadRequestException, ForbiddenException } from '@nestjs/common';
import {
  ADMIN_USER,
  CLIENT_USER,
  LAWYER_USER,
  OTHER_LAWYER,
  createPrismaMock,
  type PrismaMock,
} from '../common/testing/mocks';
import { PrismaService } from '../prisma/prisma.service';
import { CasesService } from './cases.service';

const YEAR = new Date().getFullYear();
const CLIENT_ID = CLIENT_USER.id;

const USERS: Record<string, { id: string; role: string; isActive: boolean }> = {
  [CLIENT_ID]: { id: CLIENT_ID, role: 'CLIENT', isActive: true },
  [LAWYER_USER.id]: { id: LAWYER_USER.id, role: 'LAWYER', isActive: true },
  [OTHER_LAWYER.id]: { id: OTHER_LAWYER.id, role: 'LAWYER', isActive: true },
  'inactive-lawyer': { id: 'inactive-lawyer', role: 'LAWYER', isActive: false },
};

const accessRecord = (overrides: Record<string, unknown> = {}) => ({
  id: 'case-1',
  caseNumber: `LF-${YEAR}-0001`,
  title: 'Хөдөлмөрийн маргаан',
  clientId: CLIENT_ID,
  lawyerId: LAWYER_USER.id,
  status: 'NEW',
  ...overrides,
});

describe('CasesService (staff management)', () => {
  let service: CasesService;
  let prisma: PrismaMock;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new CasesService(prisma as unknown as PrismaService);
    prisma.user.findUnique.mockImplementation(async ({ where }: any) => USERS[where.id] ?? null);
    prisma.case.findFirst.mockResolvedValue({ caseNumber: `LF-${YEAR}-0003` });
    prisma.case.create.mockImplementation(async ({ data }: any) => ({ id: 'new-case', ...data }));
    prisma.case.update.mockImplementation(async ({ data }: any) => ({ id: 'case-1', ...data }));
    prisma.caseEvent.create.mockResolvedValue({ id: 'event-1' });
  });

  describe('create', () => {
    const input = { title: 'Цалингийн маргаан', type: 'LABOR' as const, clientId: CLIENT_ID };

    it('LAWYER opens a case for themselves with the next case number', async () => {
      await service.create(input, LAWYER_USER);
      const data = prisma.case.create.mock.calls[0][0].data;
      expect(data.lawyerId).toBe(LAWYER_USER.id);
      expect(data.caseNumber).toBe(`LF-${YEAR}-0004`);
      expect(data.status).toBe('NEW');
    });

    it('LAWYER cannot assign another lawyer → 403', async () => {
      await expect(service.create({ ...input, lawyerId: OTHER_LAWYER.id }, LAWYER_USER)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(prisma.case.create).not.toHaveBeenCalled();
    });

    it('ADMIN must choose a lawyer → 400', async () => {
      await expect(service.create(input, ADMIN_USER)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('ADMIN can assign any active lawyer, but not an inactive one', async () => {
      await service.create({ ...input, lawyerId: OTHER_LAWYER.id }, ADMIN_USER);
      expect(prisma.case.create.mock.calls[0][0].data.lawyerId).toBe(OTHER_LAWYER.id);
      await expect(service.create({ ...input, lawyerId: 'inactive-lawyer' }, ADMIN_USER)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('rejects a clientId that is not an active CLIENT → 400', async () => {
      await expect(service.create({ ...input, clientId: LAWYER_USER.id }, LAWYER_USER)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('creating a case writes no STATUS_CHANGE event', async () => {
      await service.create(input, LAWYER_USER);
      expect(prisma.caseEvent.create).not.toHaveBeenCalled();
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('retries with a fresh number when two creates collide', async () => {
      prisma.case.create
        .mockRejectedValueOnce(Object.assign(new Error('unique'), { code: 'P2002' }))
        .mockImplementationOnce(async ({ data }: any) => ({ id: 'new-case', ...data }));
      await service.create(input, LAWYER_USER);
      expect(prisma.case.create).toHaveBeenCalledTimes(2);
      expect(prisma.case.findFirst).toHaveBeenCalledTimes(2);
    });
  });

  describe('update', () => {
    beforeEach(() => {
      prisma.case.findUnique.mockResolvedValue(accessRecord());
    });

    it('a status change records a STATUS_CHANGE event', async () => {
      await service.update('case-1', { status: 'IN_PROGRESS' }, LAWYER_USER);
      expect(prisma.caseEvent.create).toHaveBeenCalledTimes(1);
      const event = prisma.caseEvent.create.mock.calls[0][0].data;
      expect(event).toMatchObject({ caseId: 'case-1', type: 'STATUS_CHANGE', createdById: LAWYER_USER.id, isVisibleToClient: true });
      expect(event.title).toContain('Шинэ');
      expect(event.title).toContain('Явагдаж буй');
    });

    it('no event when the status is unchanged or not sent', async () => {
      await service.update('case-1', { title: 'Шинэ нэр оноолоо' }, LAWYER_USER);
      await service.update('case-1', { status: 'NEW' }, LAWYER_USER);
      expect(prisma.caseEvent.create).not.toHaveBeenCalled();
    });

    it('LAWYER who is not assigned → 403', async () => {
      await expect(service.update('case-1', { title: 'Өөр хуульч засав' }, OTHER_LAWYER)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(prisma.case.update).not.toHaveBeenCalled();
    });

    it('CLIENT cannot manage a case even if it is theirs → 403', async () => {
      await expect(service.update('case-1', { status: 'CLOSED' }, CLIENT_USER)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('only ADMIN can reassign the lawyer', async () => {
      await expect(service.update('case-1', { lawyerId: OTHER_LAWYER.id }, LAWYER_USER)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      await service.update('case-1', { lawyerId: OTHER_LAWYER.id }, ADMIN_USER);
      expect(prisma.case.update.mock.calls[0][0].data.lawyerId).toBe(OTHER_LAWYER.id);
    });

    it('closing via PATCH sets closedAt; reopening clears it', async () => {
      await service.update('case-1', { status: 'CLOSED' }, LAWYER_USER);
      expect(prisma.case.update.mock.calls[0][0].data.closedAt).toBeInstanceOf(Date);

      prisma.case.findUnique.mockResolvedValue(accessRecord({ status: 'CLOSED' }));
      await service.update('case-1', { status: 'IN_PROGRESS' }, LAWYER_USER);
      expect(prisma.case.update.mock.calls[1][0].data.closedAt).toBeNull();
    });
  });

  describe('close', () => {
    it('sets CLOSED + closedAt and records the note on the timeline', async () => {
      prisma.case.findUnique.mockResolvedValue(accessRecord({ status: 'IN_PROGRESS' }));
      await service.close('case-1', { note: 'Эвлэрлээр шийдвэрлэв' }, ADMIN_USER);
      const data = prisma.case.update.mock.calls[0][0].data;
      expect(data.status).toBe('CLOSED');
      expect(data.closedAt).toBeInstanceOf(Date);
      expect(prisma.caseEvent.create.mock.calls[0][0].data).toMatchObject({
        type: 'STATUS_CHANGE',
        description: 'Эвлэрлээр шийдвэрлэв',
      });
    });

    it('an already closed case → 400', async () => {
      prisma.case.findUnique.mockResolvedValue(accessRecord({ status: 'CLOSED' }));
      await expect(service.close('case-1', {}, ADMIN_USER)).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
