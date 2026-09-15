import { ForbiddenException, NotFoundException } from '@nestjs/common';
import {
  ADMIN_USER,
  CLIENT_USER,
  LAWYER_USER,
  OTHER_CLIENT,
  createPrismaMock,
  type PrismaMock,
} from '../common/testing/mocks';
import { PrismaService } from '../prisma/prisma.service';
import { CasesService } from './cases.service';

describe('CasesService (scope)', () => {
  let service: CasesService;
  let prisma: PrismaMock;

  const ownCase = { id: 'case-1', caseNumber: 'LF-2026-0001', clientId: CLIENT_USER.id, lawyerId: LAWYER_USER.id };

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new CasesService(prisma as unknown as PrismaService);
    prisma.case.findMany.mockResolvedValue([]);
    prisma.case.count.mockResolvedValue(0);
  });

  describe('findAll', () => {
    it('CLIENT only sees cases where they are the client', async () => {
      await service.findAll({ page: 1, limit: 20 }, CLIENT_USER);
      expect(prisma.case.findMany.mock.calls[0][0].where).toMatchObject({ clientId: CLIENT_USER.id });
    });

    it('LAWYER only sees cases of teams they belong to', async () => {
      await service.findAll({ page: 1, limit: 20 }, LAWYER_USER);
      expect(prisma.case.findMany.mock.calls[0][0].where).toMatchObject({ members: { some: { userId: LAWYER_USER.id } } });
      expect(prisma.case.findMany.mock.calls[0][0].where.clientId).toBeUndefined();
    });

    it('ADMIN sees everything', async () => {
      await service.findAll({ page: 1, limit: 20 }, ADMIN_USER);
      const where = prisma.case.findMany.mock.calls[0][0].where;
      expect(where.clientId).toBeUndefined();
      expect(where.lawyerId).toBeUndefined();
    });

    it('applies status filter and pagination', async () => {
      await service.findAll({ page: 3, limit: 10, status: 'CLOSED' }, ADMIN_USER);
      expect(prisma.case.findMany.mock.calls[0][0]).toMatchObject({
        where: { status: 'CLOSED' },
        skip: 20,
        take: 10,
      });
    });
  });

  describe('findOne', () => {
    it('CLIENT viewing another client’s case → 403', async () => {
      prisma.case.findUnique.mockResolvedValue(ownCase);
      await expect(service.findOne('case-1', OTHER_CLIENT)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('CLIENT viewing their own case → ok', async () => {
      prisma.case.findUnique.mockResolvedValue(ownCase);
      await expect(service.findOne('case-1', CLIENT_USER)).resolves.toBe(ownCase);
    });

    it('LAWYER viewing a case they are not assigned to → 403', async () => {
      prisma.case.findUnique.mockResolvedValue({ ...ownCase, lawyerId: 'someone-else' });
      await expect(service.findOne('case-1', LAWYER_USER)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('ADMIN can view any case', async () => {
      prisma.case.findUnique.mockResolvedValue(ownCase);
      await expect(service.findOne('case-1', ADMIN_USER)).resolves.toBe(ownCase);
    });

    it('unknown case → 404', async () => {
      prisma.case.findUnique.mockResolvedValue(null);
      await expect(service.findOne('missing', ADMIN_USER)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('findEvents', () => {
    beforeEach(() => {
      prisma.case.findUnique.mockResolvedValue(ownCase);
      prisma.caseEvent.findMany.mockResolvedValue([]);
    });

    it('CLIENT only receives events flagged visible to the client', async () => {
      await service.findEvents('case-1', CLIENT_USER);
      expect(prisma.caseEvent.findMany.mock.calls[0][0].where).toEqual({ caseId: 'case-1', isVisibleToClient: true });
    });

    it('LAWYER receives internal events too', async () => {
      await service.findEvents('case-1', LAWYER_USER);
      expect(prisma.caseEvent.findMany.mock.calls[0][0].where).toEqual({ caseId: 'case-1' });
    });

    it('CLIENT on someone else’s case → 403 before any event query', async () => {
      await expect(service.findEvents('case-1', OTHER_CLIENT)).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.caseEvent.findMany).not.toHaveBeenCalled();
    });
  });
});

describe('CasesService (staff filters stay inside scope)', () => {
  it('a LAWYER passing another lawyerId still only gets cases of their own teams', async () => {
    const prisma = createPrismaMock();
    prisma.case.findMany.mockResolvedValue([]);
    prisma.case.count.mockResolvedValue(0);
    const service = new CasesService(prisma as unknown as PrismaService);
    await service.findAll({ page: 1, limit: 20, lawyerId: 'someone-else', clientId: 'client-x' }, LAWYER_USER);
    // Filters only narrow the result: the team scope is always part of the query.
    expect(prisma.case.findMany.mock.calls[0][0].where).toMatchObject({ members: { some: { userId: LAWYER_USER.id } }, clientId: 'client-x' });
  });
});
