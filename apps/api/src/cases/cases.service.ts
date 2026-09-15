import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  CASE_NUMBER_PREFIX,
  CASE_STATUS_LABELS,
  CaseStatus,
  Role,
  nextSequenceNumber,
  type CaseQueryInput,
  type CloseCaseInput,
  type CreateCaseInput,
  type Paginated,
  type Prisma,
  type UpdateCaseInput,
} from '@law-firm/shared';
import type { RequestUser } from '../common/types/request-user';
import { isUniqueViolation } from '../common/utils/format';
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

const CASE_DETAIL_INCLUDE = {
  client: { select: { ...PUBLIC_USER_SELECT, email: true, phone: true } },
  lawyer: { select: { ...PUBLIC_USER_SELECT, email: true, phone: true } },
  _count: { select: { events: true, documents: true, invoices: true } },
} satisfies Prisma.CaseInclude;

/** Minimal case shape used by access checks in other modules. */
export interface CaseAccessRecord {
  id: string;
  caseNumber: string;
  title: string;
  clientId: string;
  lawyerId: string;
  status: CaseStatus;
}

const CASE_ACCESS_SELECT = {
  id: true,
  caseNumber: true,
  title: true,
  clientId: true,
  lawyerId: true,
  status: true,
} satisfies Prisma.CaseSelect;

const MAX_NUMBER_ATTEMPTS = 3;

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
      ...(query.status ? { status: query.status } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.clientId ? { clientId: query.clientId } : {}),
      ...(query.lawyerId ? { lawyerId: query.lawyerId } : {}),
      ...(query.search
        ? {
            OR: [
              { caseNumber: { contains: query.search, mode: 'insensitive' } },
              { title: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
      // Scope last: a CLIENT/LAWYER can never widen it with clientId/lawyerId filters.
      ...this.scopeFor(user),
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
    const record = await this.prisma.case.findUnique({ where: { id }, include: CASE_DETAIL_INCLUDE });
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

  // ─── Staff management ──────────────────────────────────────────────────────

  /**
   * ADMIN picks any active lawyer; a LAWYER can only open cases for themselves.
   * Creation is not a status change, so no STATUS_CHANGE event is written.
   */
  async create(input: CreateCaseInput, user: RequestUser) {
    let lawyerId: string;
    if (user.role === Role.ADMIN) {
      if (!input.lawyerId) throw new BadRequestException('Хариуцах хуульчийг сонгоно уу');
      lawyerId = input.lawyerId;
    } else if (user.role === Role.LAWYER) {
      if (input.lawyerId && input.lawyerId !== user.id) {
        throw new ForbiddenException('Та зөвхөн өөрийгөө хариуцах хуульчаар тохируулах боломжтой');
      }
      lawyerId = user.id;
    } else {
      throw new ForbiddenException('Энэ үйлдлийг хийх эрх танд байхгүй байна');
    }

    await this.assertUserWithRole(input.clientId, Role.CLIENT, 'Сонгосон харилцагч олдсонгүй эсвэл идэвхгүй байна');
    if (lawyerId !== user.id) {
      await this.assertUserWithRole(lawyerId, Role.LAWYER, 'Сонгосон хуульч олдсонгүй эсвэл идэвхгүй байна');
    }

    for (let attempt = 1; ; attempt += 1) {
      const caseNumber = await this.generateCaseNumber();
      try {
        return await this.prisma.case.create({
          data: {
            caseNumber,
            title: input.title,
            description: input.description ?? null,
            type: input.type,
            status: CaseStatus.NEW,
            clientId: input.clientId,
            lawyerId,
            openedAt: input.openedAt ?? new Date(),
          },
          include: CASE_DETAIL_INCLUDE,
        });
      } catch (error) {
        // Two concurrent creates can pick the same number; retry with the next one.
        if (isUniqueViolation(error) && attempt < MAX_NUMBER_ATTEMPTS) continue;
        throw error;
      }
    }
  }

  /** ADMIN or the assigned LAWYER. Only ADMIN may reassign the lawyer. */
  async update(id: string, input: UpdateCaseInput, user: RequestUser) {
    const existing = await this.assertStaffAccessById(id, user);

    if (input.lawyerId && input.lawyerId !== existing.lawyerId) {
      if (user.role !== Role.ADMIN) {
        throw new ForbiddenException('Хариуцах хуульчийг зөвхөн админ солих боломжтой');
      }
      await this.assertUserWithRole(input.lawyerId, Role.LAWYER, 'Сонгосон хуульч олдсонгүй эсвэл идэвхгүй байна');
    }

    const statusChanged = input.status !== undefined && input.status !== existing.status;
    const data: Prisma.CaseUncheckedUpdateInput = {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.type !== undefined ? { type: input.type } : {}),
      ...(input.lawyerId !== undefined ? { lawyerId: input.lawyerId } : {}),
    };
    if (statusChanged) {
      data.status = input.status;
      if (input.status === CaseStatus.CLOSED) data.closedAt = new Date();
      if (existing.status === CaseStatus.CLOSED) data.closedAt = null;
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.case.update({ where: { id }, data, include: CASE_DETAIL_INCLUDE });
      if (statusChanged) {
        await tx.caseEvent.create({
          data: this.statusChangeEvent(id, existing.status, input.status as CaseStatus, user.id),
        });
      }
      return updated;
    });
  }

  /** Sets status=CLOSED and closedAt, recording the change on the timeline. */
  async close(id: string, input: CloseCaseInput, user: RequestUser) {
    const existing = await this.assertStaffAccessById(id, user);
    if (existing.status === CaseStatus.CLOSED) {
      throw new BadRequestException('Хэрэг аль хэдийн хаагдсан байна');
    }
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.case.update({
        where: { id },
        data: { status: CaseStatus.CLOSED, closedAt: new Date() },
        include: CASE_DETAIL_INCLUDE,
      });
      await tx.caseEvent.create({
        data: this.statusChangeEvent(id, existing.status, CaseStatus.CLOSED, user.id, input.note),
      });
      return updated;
    });
  }

  // ─── Access checks (shared with documents, invoices, events) ───────────────

  /** Loads the case (minimal) and throws 404/403 for read access. */
  async assertAccessById(caseId: string, user: RequestUser): Promise<CaseAccessRecord> {
    const record = await this.prisma.case.findUnique({ where: { id: caseId }, select: CASE_ACCESS_SELECT });
    if (!record) throw new NotFoundException('Хэрэг олдсонгүй');
    this.assertAccess(record, user);
    return record;
  }

  /** Loads the case (minimal) and throws 404/403 for management (write) access. */
  async assertStaffAccessById(caseId: string, user: RequestUser): Promise<CaseAccessRecord> {
    const record = await this.prisma.case.findUnique({ where: { id: caseId }, select: CASE_ACCESS_SELECT });
    if (!record) throw new NotFoundException('Хэрэг олдсонгүй');
    this.assertStaffAccess(record, user);
    return record;
  }

  /** Read access: ADMIN, the assigned LAWYER, or the case's CLIENT. */
  assertAccess(record: { clientId: string; lawyerId: string }, user: RequestUser): void {
    if (user.role === Role.ADMIN) return;
    if (user.role === Role.LAWYER && record.lawyerId === user.id) return;
    if (user.role === Role.CLIENT && record.clientId === user.id) return;
    throw new ForbiddenException('Энэ хэргийг үзэх эрх танд байхгүй байна');
  }

  /** Write access: ADMIN or the assigned LAWYER only. */
  assertStaffAccess(record: { lawyerId: string }, user: RequestUser): void {
    if (user.role === Role.ADMIN) return;
    if (user.role === Role.LAWYER && record.lawyerId === user.id) return;
    throw new ForbiddenException('Энэ хэргийг удирдах эрх танд байхгүй байна');
  }

  // ─── helpers ───────────────────────────────────────────────────────────────

  private async generateCaseNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const last = await this.prisma.case.findFirst({
      where: { caseNumber: { startsWith: `${CASE_NUMBER_PREFIX}-${year}-` } },
      orderBy: { caseNumber: 'desc' },
      select: { caseNumber: true },
    });
    return nextSequenceNumber(CASE_NUMBER_PREFIX, year, last?.caseNumber ?? null);
  }

  private async assertUserWithRole(userId: string, role: Role, message: string): Promise<void> {
    const found = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, isActive: true },
    });
    if (!found || found.role !== role || !found.isActive) throw new BadRequestException(message);
  }

  private statusChangeEvent(
    caseId: string,
    from: CaseStatus,
    to: CaseStatus,
    userId: string,
    note?: string,
  ): Prisma.CaseEventUncheckedCreateInput {
    return {
      caseId,
      type: 'STATUS_CHANGE',
      title: `Төлөв өөрчлөгдлөө: ${CASE_STATUS_LABELS[from]} → ${CASE_STATUS_LABELS[to]}`,
      description: note?.trim() ? note.trim() : null,
      eventDate: new Date(),
      createdById: userId,
      isVisibleToClient: true,
    };
  }
}
