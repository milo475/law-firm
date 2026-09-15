import { Injectable } from '@nestjs/common';
import { CaseStatus, InvoiceStatus, Role, type AdminStats, type Prisma } from '@law-firm/shared';
import type { RequestUser } from '../common/types/request-user';
import { PrismaService } from '../prisma/prisma.service';

const UPCOMING_DAYS = 7;
const UPCOMING_TYPES = ['HEARING', 'MEETING', 'DEADLINE'] as const;
const CASE_STATUSES = Object.values(CaseStatus);

@Injectable()
export class AdminStatsService {
  constructor(private readonly prisma: PrismaService) {}

  async stats(user: RequestUser): Promise<AdminStats> {
    const now = new Date();
    const horizon = new Date(now.getTime() + UPCOMING_DAYS * 86_400_000);
    const caseScope: Prisma.CaseWhereInput = user.role === Role.LAWYER ? { lawyerId: user.id } : {};
    const upcomingWhere: Prisma.CaseEventWhereInput = {
      eventDate: { gte: now, lte: horizon },
      type: { in: [...UPCOMING_TYPES] },
      case: caseScope,
    };

    const upcomingEvents = await this.prisma.caseEvent.findMany({
      where: upcomingWhere,
      orderBy: { eventDate: 'asc' },
      take: 10,
      select: {
        id: true,
        type: true,
        title: true,
        eventDate: true,
        case: { select: { id: true, caseNumber: true, title: true } },
      },
    });
    const events = upcomingEvents.map((event) => ({ ...event, eventDate: event.eventDate.toISOString() }));

    if (user.role === Role.LAWYER) {
      const [openCases, upcomingEventCount, unpaid] = await Promise.all([
        this.prisma.case.count({ where: { lawyerId: user.id, status: { not: CaseStatus.CLOSED } } }),
        this.prisma.caseEvent.count({ where: upcomingWhere }),
        this.prisma.invoice.aggregate({
          where: { case: { lawyerId: user.id }, status: { in: [InvoiceStatus.SENT, InvoiceStatus.OVERDUE] } },
          _sum: { amount: true },
          _count: { _all: true },
        }),
      ]);
      return {
        role: 'LAWYER',
        upcomingEvents: events,
        lawyer: {
          openCases,
          upcomingEventCount,
          unpaidInvoiceCount: unpaid._count._all,
          unpaidInvoiceTotal: String(unpaid._sum.amount ?? 0),
        },
      };
    }

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const [statusCounts, activeLawyers, monthInvoices, newContactRequests] = await Promise.all([
      Promise.all(CASE_STATUSES.map((status) => this.prisma.case.count({ where: { status } }))),
      this.prisma.user.count({ where: { role: Role.LAWYER, isActive: true } }),
      this.prisma.invoice.aggregate({
        where: { createdAt: { gte: monthStart }, status: { not: InvoiceStatus.CANCELLED } },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      this.prisma.contactRequest.count({ where: { status: 'NEW' } }),
    ]);
    const casesByStatus = Object.fromEntries(CASE_STATUSES.map((status, i) => [status, statusCounts[i]])) as Record<CaseStatus, number>;

    return {
      role: 'ADMIN',
      upcomingEvents: events,
      admin: {
        casesByStatus,
        totalCases: statusCounts.reduce((sum, count) => sum + count, 0),
        activeLawyers,
        invoicesThisMonth: { count: monthInvoices._count._all, total: String(monthInvoices._sum.amount ?? 0) },
        newContactRequests,
      },
    };
  }
}
