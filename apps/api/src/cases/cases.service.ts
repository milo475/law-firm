import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Role, type CaseQueryInput, type Paginated, type Prisma } from '@law-firm/shared';
import type { RequestUser } from '../common/types/request-user';
import { paginate, skipTake } from '../common/utils/pagination';
import { PUBLIC_USER_SELECT } from '../common/utils/safe-user';
import { PrismaService } from '../prisma/prisma.service';

const CASE_LIST_SELECT = {
  id: true,
  caseNumber: true,
  title: true,
  type: true,
  status: true,
  openedAt: true,
  closedAt: true,
  updatedAt: true,
  client: { select: PUBLIC_USER_SELECT },
  lawyer: { select: PUBLIC_USER_SELECT },
  _count: { select: { events: true, documents: true, invoices: true } },
} satisfies Prisma.CaseSelect;

@Injectable()
export class CasesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Role-based visibility:
   *   CLIENT → cases where they are the client
   *   LAWYER → cases they are assigned to
   *   ADMIN  → everything
   */
  scopeFor(user: RequestUser): Prisma.CaseWhereInput {
    switch (user.role) {
      case Role.ADMIN:
        return {};
      case Role.LAWYER:
        return { lawyerId: user.id };
      case Role.CLIENT:
      default:
        return { clientId: user.id };
    }
  }

  async findAll(query: CaseQueryInput, user: RequestUser): Promise<Paginated<unknown>> {
    const where: Prisma.CaseWhereInput = {
      ...this.scopeFor(user),
      ...(query.status ? { status: query.status } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.search
        ? {
            OR: [
              { caseNumber: { contains: query.search, mode: 'insensitive' } },
              { title: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.case.findMany({
        where,
        select: CASE_LIST_SELECT,
        orderBy: { updatedAt: 'desc' },
        ...skipTake(query.page, query.limit),
      }),
      this.prisma.case.count({ where }),
    ]);
    return paginate(items, total, query.page, query.limit);
  }

  async findOne(id: string, user: RequestUser) {
    const record = await this.prisma.case.findUnique({
      where: { id },
      include: {
        client: { select: { ...PUBLIC_USER_SELECT, email: true, phone: true } },
        lawyer: { select: { ...PUBLIC_USER_SELECT, email: true, phone: true } },
        _count: { select: { events: true, documents: true, invoices: true } },
      },
    });
    if (!record) throw new NotFoundException('Хэрэг олдсонгүй');
    this.assertAccess(record, user);
    return record;
  }

  /** Timeline; CLIENTs only see events flagged visible to them. */
  async findEvents(caseId: string, user: RequestUser) {
    await this.assertAccessById(caseId, user);
    return this.prisma.caseEvent.findMany({
      where: {
        caseId,
        ...(user.role === Role.CLIENT ? { isVisibleToClient: true } : {}),
      },
      include: { createdBy: { select: PUBLIC_USER_SELECT } },
      orderBy: { eventDate: 'desc' },
    });
  }

  /** Loads the case (minimal) and throws 404/403 as appropriate. Used by documents & invoices. */
  async assertAccessById(caseId: string, user: RequestUser) {
    const record = await this.prisma.case.findUnique({
      where: { id: caseId },
      select: { id: true, caseNumber: true, clientId: true, lawyerId: true, status: true },
    });
    if (!record) throw new NotFoundException('Хэрэг олдсонгүй');
    this.assertAccess(record, user);
    return record;
  }

  assertAccess(record: { clientId: string; lawyerId: string }, user: RequestUser): void {
    if (user.role === Role.ADMIN) return;
    if (user.role === Role.LAWYER && record.lawyerId === user.id) return;
    if (user.role === Role.CLIENT && record.clientId === user.id) return;
    throw new ForbiddenException('Энэ хэргийг үзэх эрх танд байхгүй байна');
  }
}
