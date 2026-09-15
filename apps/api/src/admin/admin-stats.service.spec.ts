import { ADMIN_USER, LAWYER_USER, createPrismaMock, type PrismaMock } from '../common/testing/mocks';
import { PrismaService } from '../prisma/prisma.service';
import { AdminStatsService } from './admin-stats.service';

describe('AdminStatsService', () => {
  let service: AdminStatsService;
  let prisma: PrismaMock;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new AdminStatsService(prisma as unknown as PrismaService);
    prisma.caseEvent.findMany.mockResolvedValue([
      { id: 'e1', type: 'HEARING', title: 'Шүүх хурал', eventDate: new Date('2026-09-20T02:00:00Z'), case: { id: 'c1', caseNumber: 'LF-2026-0001', title: 'x' } },
    ]);
    prisma.caseEvent.count.mockResolvedValue(1);
    prisma.invoice.aggregate.mockResolvedValue({ _sum: { amount: '1250000' }, _count: { _all: 2 } });
  });

  it('LAWYER stats are scoped to their own cases and include no admin block', async () => {
    prisma.case.count.mockResolvedValue(3);
    const stats = await service.stats(LAWYER_USER);
    expect(prisma.case.count.mock.calls[0][0].where).toMatchObject({ members: { some: { userId: LAWYER_USER.id } }, status: { not: 'CLOSED' } });
    expect(prisma.caseEvent.findMany.mock.calls[0][0].where.case).toEqual({ members: { some: { userId: LAWYER_USER.id } } });
    expect(prisma.invoice.aggregate.mock.calls[0][0].where.case).toEqual({ members: { some: { userId: LAWYER_USER.id } } });
    expect(stats).toMatchObject({ role: 'LAWYER', lawyer: { openCases: 3, upcomingEventCount: 1, unpaidInvoiceCount: 2, unpaidInvoiceTotal: '1250000' } });
    expect(stats.admin).toBeUndefined();
    expect(stats.upcomingEvents[0].eventDate).toBe('2026-09-20T02:00:00.000Z');
  });

  it('ADMIN stats cover every case status, active lawyers, this month\'s invoices and new requests', async () => {
    const counts: Record<string, number> = { NEW: 2, IN_PROGRESS: 5, WAITING: 1, CLOSED: 7 };
    prisma.case.count.mockImplementation(async ({ where }: any) => counts[where.status]);
    prisma.user.count.mockResolvedValue(4);
    prisma.serviceRequest.count.mockResolvedValue(6);
    const stats = await service.stats(ADMIN_USER);
    expect(prisma.caseEvent.findMany.mock.calls[0][0].where.case).toEqual({});
    expect(stats.admin).toEqual({
      casesByStatus: counts,
      totalCases: 15,
      activeLawyers: 4,
      invoicesThisMonth: { count: 2, total: '1250000' },
      newServiceRequests: 6,
    });
    expect(stats.lawyer).toBeUndefined();
  });
});
