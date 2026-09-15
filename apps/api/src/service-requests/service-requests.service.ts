import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  CaseMemberRole,
  CaseStatus,
  Role,
  SERVICE_REQUEST_STATUS_LABELS,
  ServiceRequestStatus,
  assignmentTeam,
  type AssignServiceRequestInput,
  type CaseType,
  type CreateServiceRequestInput,
  type Paginated,
  type PaginationInput,
  type Prisma,
  type RejectServiceRequestInput,
  type ServiceRequestQueryInput,
  type ServiceRequestSummary,
  type ServiceRequestType,
} from '@law-firm/shared';
import { CasesService } from '../cases/cases.service';
import type { RequestUser } from '../common/types/request-user';
import { isUniqueViolation } from '../common/utils/format';
import { paginate, skipTake } from '../common/utils/pagination';
import { PUBLIC_USER_SELECT } from '../common/utils/safe-user';
import { PrismaService } from '../prisma/prisma.service';
import {
  SERVICE_REQUEST_EVENTS,
  type ServiceRequestAssignedEvent,
  type ServiceRequestCreatedEvent,
  type ServiceRequestRef,
  type ServiceRequestRejectedEvent,
  type ServiceRequestReviewedEvent,
} from './service-request.events';

const REQUEST_SELECT = {
  id: true,
  type: true,
  caseType: true,
  title: true,
  description: true,
  status: true,
  reviewedAt: true,
  rejectionReason: true,
  assignedCaseId: true,
  createdAt: true,
  updatedAt: true,
  requester: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, avatarUrl: true } },
  reviewedBy: { select: PUBLIC_USER_SELECT },
  assignedCase: { select: { id: true, caseNumber: true, title: true, status: true } },
} satisfies Prisma.ServiceRequestSelect;

type RequestRecord = Prisma.ServiceRequestGetPayload<{ select: typeof REQUEST_SELECT }>;

/** Words looked for in LawyerProfile.specializations (e.g. «Иргэний эрх зүй») for each case type. */
const SPECIALIZATION_KEYWORDS: Record<CaseType, string[]> = {
  CIVIL: ['иргэний', 'гэрээ'],
  CRIMINAL: ['эрүүгийн'],
  FAMILY: ['гэр бүл'],
  BUSINESS: ['бизнес', 'компани', 'аж ахуй'],
  LABOR: ['хөдөлмөр'],
  REAL_ESTATE: ['үл хөдлөх', 'газар'],
  OTHER: [],
};

const MAX_NUMBER_ATTEMPTS = 3;

@Injectable()
export class ServiceRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cases: CasesService,
    private readonly events: EventEmitter2,
  ) {}

  /** CLIENT: a new request starts as NEW; every active ADMIN is notified. */
  async create(input: CreateServiceRequestInput, user: RequestUser) {
    const record = await this.prisma.serviceRequest.create({
      data: { requesterId: user.id, type: input.type, caseType: input.caseType, title: input.title, description: input.description },
      select: REQUEST_SELECT,
    });
    this.events.emit(SERVICE_REQUEST_EVENTS.created, { request: this.ref(record) } satisfies ServiceRequestCreatedEvent);
    return this.forViewer(record, user);
  }

  /** ADMIN: every request, newest first, filtered by status, type and case type. */
  async findAll(query: ServiceRequestQueryInput): Promise<Paginated<unknown>> {
    const where: Prisma.ServiceRequestWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.caseType ? { caseType: query.caseType } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.serviceRequest.findMany({ where, select: REQUEST_SELECT, orderBy: { createdAt: 'desc' }, ...skipTake(query.page, query.limit) }),
      this.prisma.serviceRequest.count({ where }),
    ]);
    return paginate(items, total, query.page, query.limit);
  }

  /** ADMIN: counts behind the sidebar and dashboard badges. */
  async summary(): Promise<ServiceRequestSummary> {
    const [fresh, accepted] = await Promise.all([
      this.prisma.serviceRequest.count({ where: { status: ServiceRequestStatus.NEW } }),
      this.prisma.serviceRequest.count({ where: { status: ServiceRequestStatus.ACCEPTED } }),
    ]);
    return { new: fresh, accepted };
  }

  /** CLIENT: their own requests with the status, the rejection reason and the opened case. */
  async findMine(query: PaginationInput, user: RequestUser): Promise<Paginated<unknown>> {
    const where: Prisma.ServiceRequestWhereInput = { requesterId: user.id };
    const [items, total] = await Promise.all([
      this.prisma.serviceRequest.findMany({ where, select: REQUEST_SELECT, orderBy: { createdAt: 'desc' }, ...skipTake(query.page, query.limit) }),
      this.prisma.serviceRequest.count({ where }),
    ]);
    return paginate(items.map((item) => this.forViewer(item, user)), total, query.page, query.limit);
  }

  /** ADMIN sees any request; a CLIENT only their own. */
  async findOne(id: string, user: RequestUser) {
    const record = await this.prisma.serviceRequest.findUnique({ where: { id }, select: REQUEST_SELECT });
    if (!record) throw new NotFoundException('Хүсэлт олдсонгүй');
    if (user.role !== Role.ADMIN && record.requester.id !== user.id) {
      throw new ForbiddenException('Энэ хүсэлтийг үзэх эрх танд байхгүй байна');
    }
    return this.forViewer(record, user);
  }

  /** NEW → ACCEPTED. The status check is part of the update, so two admins cannot both accept. */
  async accept(id: string, user: RequestUser) {
    await this.claim(id, [ServiceRequestStatus.NEW], ServiceRequestStatus.ACCEPTED, { reviewedById: user.id, reviewedAt: new Date() });
    const record = await this.findOne(id, user);
    this.events.emit(SERVICE_REQUEST_EVENTS.accepted, { request: this.ref(record as RequestRecord), actorId: user.id } satisfies ServiceRequestReviewedEvent);
    return record;
  }

  /** NEW or ACCEPTED → REJECTED with the reason the requester sees. */
  async reject(id: string, input: RejectServiceRequestInput, user: RequestUser) {
    await this.claim(id, [ServiceRequestStatus.NEW, ServiceRequestStatus.ACCEPTED], ServiceRequestStatus.REJECTED, {
      reviewedById: user.id,
      reviewedAt: new Date(),
      rejectionReason: input.rejectionReason,
    });
    const record = await this.findOne(id, user);
    this.events.emit(SERVICE_REQUEST_EVENTS.rejected, {
      request: this.ref(record as RequestRecord),
      actorId: user.id,
      reason: input.rejectionReason,
    } satisfies ServiceRequestRejectedEvent);
    return record;
  }

  /**
   * ACCEPTED → CONVERTED: opens a case for the requester with one lawyer or a team (the lead becomes Case.lawyerId and the
   * LEAD member) and links it to the request. Status and case commit together, so a second assign is a 400, never a second case.
   */
  async assign(id: string, input: AssignServiceRequestInput, user: RequestUser) {
    const team = assignmentTeam(input);
    const request = await this.prisma.serviceRequest.findUnique({
      where: { id },
      select: { id: true, status: true, title: true, description: true, caseType: true, requesterId: true, requester: { select: { isActive: true } } },
    });
    if (!request) throw new NotFoundException('Хүсэлт олдсонгүй');
    if (request.status !== ServiceRequestStatus.ACCEPTED) {
      throw new BadRequestException(this.transitionError(request.status, ServiceRequestStatus.CONVERTED));
    }
    if (!request.requester.isActive) throw new BadRequestException('Хүсэлт гаргасан харилцагчийн хаяг идэвхгүй байна');
    await this.assertActiveLawyers([team.leadId, ...team.memberIds]);

    const caseRef = await this.openCase(request, team, user);
    const record = await this.findOne(id, user);
    this.events.emit(SERVICE_REQUEST_EVENTS.assigned, {
      request: this.ref(record as RequestRecord),
      actorId: user.id,
      caseRef,
      leadId: team.leadId,
      memberIds: team.memberIds,
    } satisfies ServiceRequestAssignedEvent);
    return record;
  }

  /** ADMIN: active lawyers whose specializations fit the request's case type (every active lawyer when none do), least busy first. */
  async suggestedLawyers(id: string) {
    const request = await this.prisma.serviceRequest.findUnique({ where: { id }, select: { caseType: true } });
    if (!request) throw new NotFoundException('Хүсэлт олдсонгүй');

    const lawyers = await this.prisma.user.findMany({
      where: { role: Role.LAWYER, isActive: true },
      select: { id: true, firstName: true, lastName: true, avatarUrl: true, lawyerProfile: { select: { title: true, specializations: true } } },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });
    const open = await this.prisma.case.groupBy({
      by: ['lawyerId'],
      where: { lawyerId: { in: lawyers.map((lawyer) => lawyer.id) }, status: { not: CaseStatus.CLOSED } },
      _count: { _all: true },
    });
    const openCases = new Map(open.map((row) => [row.lawyerId, row._count._all]));
    const keywords = SPECIALIZATION_KEYWORDS[request.caseType];

    const rows = lawyers.map((lawyer) => {
      const specializations = lawyer.lawyerProfile?.specializations ?? [];
      return {
        id: lawyer.id,
        firstName: lawyer.firstName,
        lastName: lawyer.lastName,
        avatarUrl: lawyer.avatarUrl,
        title: lawyer.lawyerProfile?.title ?? null,
        specializations,
        openCases: openCases.get(lawyer.id) ?? 0,
        matches: specializations.some((specialization) => keywords.some((keyword) => specialization.toLowerCase().includes(keyword))),
      };
    });
    const matching = rows.filter((row) => row.matches);
    const items = (matching.length > 0 ? matching : rows).sort((a, b) => a.openCases - b.openCases);
    return { caseType: request.caseType, matched: matching.length > 0, items };
  }

  // ─── helpers ───────────────────────────────────────────────────────────────

  private async openCase(
    request: { id: string; title: string; description: string; caseType: CaseType; requesterId: string },
    team: { leadId: string; memberIds: string[] },
    user: RequestUser,
  ): Promise<{ id: string; caseNumber: string; title: string }> {
    for (let attempt = 1; ; attempt += 1) {
      const caseNumber = await this.cases.nextCaseNumber();
      try {
        return await this.prisma.$transaction(async (tx) => {
          const claimed = await tx.serviceRequest.updateMany({
            where: { id: request.id, status: ServiceRequestStatus.ACCEPTED },
            data: { status: ServiceRequestStatus.CONVERTED, reviewedById: user.id, reviewedAt: new Date() },
          });
          if (claimed.count === 0) throw new BadRequestException('Энэ хүсэлтээр хэрэг аль хэдийн нээгдсэн байна');
          const opened = await tx.case.create({
            data: {
              caseNumber,
              title: request.title,
              description: request.description,
              type: request.caseType,
              status: CaseStatus.NEW,
              clientId: request.requesterId,
              lawyerId: team.leadId,
              members: {
                create: [
                  { userId: team.leadId, role: CaseMemberRole.LEAD, addedById: user.id },
                  ...team.memberIds.map((userId) => ({ userId, role: CaseMemberRole.MEMBER, addedById: user.id })),
                ],
              },
            },
            select: { id: true, caseNumber: true, title: true },
          });
          await tx.serviceRequest.update({ where: { id: request.id }, data: { assignedCaseId: opened.id } });
          return opened;
        });
      } catch (error) {
        // Another case took the number; the whole step rolled back, so the request is still ACCEPTED — try the next number.
        if (isUniqueViolation(error) && attempt < MAX_NUMBER_ATTEMPTS) continue;
        throw error;
      }
    }
  }

  /** Moves the request only when it is still in one of `from`; otherwise explains why with 404 / 400. */
  private async claim(id: string, from: ServiceRequestStatus[], to: ServiceRequestStatus, data: Prisma.ServiceRequestUncheckedUpdateManyInput) {
    const { count } = await this.prisma.serviceRequest.updateMany({ where: { id, status: { in: from } }, data: { ...data, status: to } });
    if (count === 1) return;
    const existing = await this.prisma.serviceRequest.findUnique({ where: { id }, select: { status: true } });
    if (!existing) throw new NotFoundException('Хүсэлт олдсонгүй');
    throw new BadRequestException(this.transitionError(existing.status, to));
  }

  private transitionError(from: ServiceRequestStatus, to: ServiceRequestStatus): string {
    if (from === ServiceRequestStatus.CONVERTED) return 'Энэ хүсэлтээр хэрэг аль хэдийн нээгдсэн байна';
    if (from === ServiceRequestStatus.REJECTED) return 'Татгалзсан хүсэлтийг өөрчлөх боломжгүй';
    if (from === to) return `Хүсэлт аль хэдийн «${SERVICE_REQUEST_STATUS_LABELS[from]}» төлөвтэй байна`;
    if (from === ServiceRequestStatus.NEW && to === ServiceRequestStatus.CONVERTED) return 'Эхлээд хүсэлтийг хүлээж авна уу';
    return `Хүсэлтийн төлөвийг «${SERVICE_REQUEST_STATUS_LABELS[from]}»-аас «${SERVICE_REQUEST_STATUS_LABELS[to]}» болгох боломжгүй`;
  }

  private async assertActiveLawyers(ids: string[]): Promise<void> {
    const unique = [...new Set(ids)];
    const found = await this.prisma.user.count({ where: { id: { in: unique }, role: Role.LAWYER, isActive: true } });
    if (found !== unique.length) throw new BadRequestException('Сонгосон өмгөөлөгч олдсонгүй эсвэл идэвхгүй байна');
  }

  /** Clients never see which admin reviewed their request. */
  private forViewer(record: RequestRecord, user: RequestUser) {
    return user.role === Role.ADMIN ? record : { ...record, reviewedBy: null };
  }

  private ref(record: { id: string; title: string; type: ServiceRequestType; requester: { id: string; firstName: string; lastName: string } }): ServiceRequestRef {
    return {
      id: record.id,
      title: record.title,
      type: record.type,
      requesterId: record.requester.id,
      requesterName: `${record.requester.lastName.charAt(0)}. ${record.requester.firstName}`,
    };
  }
}
