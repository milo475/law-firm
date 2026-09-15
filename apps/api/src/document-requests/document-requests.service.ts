import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  DOCUMENT_REQUEST_CLIENT_ACTION_STATUSES,
  DOCUMENT_REQUEST_EDITABLE_STATUSES,
  DOCUMENT_REQUEST_STATUS_LABELS,
  MAX_DOCUMENT_REQUEST_FILES,
  Role,
  canTransitionDocumentRequest,
  type CreateDocumentRequestInput,
  type DocumentRequestQueryInput,
  type DocumentRequestStatus,
  type Prisma,
  type ReviewDocumentRequestInput,
  type UpdateDocumentRequestInput,
} from '@law-firm/shared';
import { CasesService } from '../cases/cases.service';
import type { RequestUser } from '../common/types/request-user';
import { PUBLIC_USER_SELECT } from '../common/utils/safe-user';
import { DOCUMENT_SELECT, DocumentsService, type StoredFile, type UploadedFile } from '../documents/documents.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  DOCUMENT_REQUEST_EVENTS,
  type DocumentRequestCaseRef,
  type DocumentRequestCreatedEvent,
  type DocumentRequestReviewedEvent,
  type DocumentRequestSubmittedEvent,
} from './document-request.events';

const CASE_REF_SELECT = { caseNumber: true, clientId: true, lawyerId: true, status: true } as const;

/** Requests a lawyer still has to look at. */
const AWAITING_REVIEW_STATUSES: DocumentRequestStatus[] = ['SUBMITTED', 'UNDER_REVIEW'];

function caseRef(caseId: string, record: { caseNumber: string; clientId: string; lawyerId: string }): DocumentRequestCaseRef {
  return { id: caseId, caseNumber: record.caseNumber, clientId: record.clientId, lawyerId: record.lawyerId };
}

@Injectable()
export class DocumentRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cases: CasesService,
    private readonly documents: DocumentsService,
    private readonly events: EventEmitter2,
  ) {}

  /** Requests of one case with their files. Every role reads within its own case scope. */
  async findByCase(caseId: string, query: DocumentRequestQueryInput, user: RequestUser) {
    await this.cases.assertAccessById(caseId, user);
    return this.prisma.documentRequest.findMany({
      where: { caseId, ...(query.status ? { status: query.status } : {}) },
      include: this.includeFor(user),
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Open work per case: for a CLIENT the requests waiting for them (PENDING + REJECTED),
   * for staff the submissions waiting for review (SUBMITTED + UNDER_REVIEW).
   */
  async summary(user: RequestUser) {
    const statuses: DocumentRequestStatus[] =
      user.role === Role.CLIENT ? [...DOCUMENT_REQUEST_CLIENT_ACTION_STATUSES] : AWAITING_REVIEW_STATUSES;
    const groups = await this.prisma.documentRequest.groupBy({
      by: ['caseId'],
      where: { status: { in: statuses }, case: this.cases.scopeFor(user) },
      _count: { _all: true },
    });
    if (groups.length === 0) return { total: 0, statuses, cases: [] };

    const cases = await this.prisma.case.findMany({
      where: { id: { in: groups.map((group) => group.caseId) } },
      select: { id: true, caseNumber: true, title: true },
    });
    const byId = new Map(cases.map((item) => [item.id, item]));
    const rows = groups
      .map((group) => ({
        caseId: group.caseId,
        caseNumber: byId.get(group.caseId)?.caseNumber ?? '',
        title: byId.get(group.caseId)?.title ?? '',
        count: group._count._all,
      }))
      .sort((a, b) => b.count - a.count);
    return { total: rows.reduce((sum, row) => sum + row.count, 0), statuses, cases: rows };
  }

  /** ADMIN or the assigned LAWYER asks the client for one or more documents at once. */
  async create(caseId: string, input: CreateDocumentRequestInput, user: RequestUser) {
    const record = await this.cases.assertStaffAccessById(caseId, user);
    if (record.status === 'CLOSED') throw new BadRequestException('Хаагдсан хэрэгт баримт хүсэх боломжгүй');

    const include = this.includeFor(user);
    const created = await this.prisma.$transaction(
      input.items.map((item) =>
        this.prisma.documentRequest.create({
          data: {
            caseId,
            requestedById: user.id,
            title: item.title,
            description: item.description?.trim() ? item.description.trim() : null,
            isRequired: item.isRequired,
            dueDate: item.dueDate ?? null,
          },
          include,
        }),
      ),
    );

    const event: DocumentRequestCreatedEvent = {
      caseRef: caseRef(caseId, record),
      actorId: user.id,
      requests: created.map((request) => ({ id: request.id, title: request.title, dueDate: request.dueDate })),
    };
    await this.events.emitAsync(DOCUMENT_REQUEST_EVENTS.created, event);
    return created;
  }

  /** Edits the wording or deadline while the client still has to act (PENDING or REJECTED). */
  async update(id: string, input: UpdateDocumentRequestInput, user: RequestUser) {
    const existing = await this.loadForStaff(id, user);
    if (!(DOCUMENT_REQUEST_EDITABLE_STATUSES as readonly DocumentRequestStatus[]).includes(existing.status)) {
      throw new BadRequestException('Зөвхөн хүлээгдэж буй эсвэл буцаагдсан хүсэлтийг засах боломжтой');
    }
    return this.prisma.documentRequest.update({
      where: { id },
      data: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.description !== undefined ? { description: input.description?.trim() ? input.description.trim() : null } : {}),
        ...(input.isRequired !== undefined ? { isRequired: input.isRequired } : {}),
        ...(input.dueDate !== undefined ? { dueDate: input.dueDate } : {}),
      },
      include: this.includeFor(user),
    });
  }

  /** Only requests without any attached file can be deleted. */
  async remove(id: string, user: RequestUser): Promise<void> {
    const existing = await this.loadForStaff(id, user);
    if (existing._count.documents > 0) {
      throw new BadRequestException('Файл хавсаргагдсан хүсэлтийг устгах боломжгүй');
    }
    await this.prisma.documentRequest.delete({ where: { id } });
  }

  /**
   * The case's CLIENT answers a PENDING or REJECTED request with one or more files.
   * Files go to MinIO first; if the database write fails they are removed again.
   */
  async submit(id: string, files: UploadedFile[] | undefined, user: RequestUser) {
    const request = await this.load(id);
    if (user.role !== Role.CLIENT || request.case.clientId !== user.id) {
      throw new ForbiddenException('Энэ баримтын хүсэлтэд хариу илгээх эрх танд байхгүй байна');
    }
    if (!canTransitionDocumentRequest(request.status, 'SUBMITTED')) {
      throw new BadRequestException(
        `«${DOCUMENT_REQUEST_STATUS_LABELS[request.status]}» төлөвтэй хүсэлтэд файл илгээх боломжгүй`,
      );
    }
    if (!files || files.length === 0) {
      throw new BadRequestException('Хамгийн багадаа нэг файл хавсаргана уу (multipart талбар: "files")');
    }
    if (files.length > MAX_DOCUMENT_REQUEST_FILES) {
      throw new BadRequestException(`Нэг удаад ${MAX_DOCUMENT_REQUEST_FILES}-аас ихгүй файл илгээнэ үү`);
    }
    for (const file of files) this.documents.assertValidFile(file);

    const stored: StoredFile[] = [];
    let updated;
    try {
      for (const file of files) stored.push(await this.documents.storeFile(request.case.caseNumber, file));
      updated = await this.prisma.$transaction(async (tx) => {
        // Guard against a concurrent review/submit changing the status in between.
        const moved = await tx.documentRequest.updateMany({
          where: { id, status: request.status },
          data: { status: 'SUBMITTED', rejectionReason: null, reviewedById: null, reviewedAt: null },
        });
        if (moved.count === 0) throw new ConflictException('Хүсэлтийн төлөв өөрчлөгдсөн байна. Хуудсаа шинэчилнэ үү');
        for (const file of stored) {
          await tx.document.create({
            data: { ...file, caseId: request.caseId, requestId: id, uploadedById: user.id, isVisibleToClient: true },
          });
        }
        return tx.documentRequest.findUniqueOrThrow({ where: { id }, include: this.includeFor(user) });
      });
    } catch (error) {
      await this.documents.discardStored(stored.map((file) => file.storageKey));
      throw error;
    }

    const event: DocumentRequestSubmittedEvent = {
      caseRef: caseRef(request.caseId, request.case),
      actorId: user.id,
      request: { id, title: request.title },
      fileCount: stored.length,
    };
    await this.events.emitAsync(DOCUMENT_REQUEST_EVENTS.submitted, event);
    return updated;
  }

  /** ADMIN or the assigned LAWYER marks a submission as under review, approves or rejects it. */
  async review(id: string, input: ReviewDocumentRequestInput, user: RequestUser) {
    const request = await this.loadForStaff(id, user);
    const reason = input.rejectionReason?.trim() ?? '';
    if (input.decision === 'REJECTED' && reason.length === 0) {
      throw new BadRequestException('Буцаах шалтгааныг бичнэ үү');
    }
    if (!canTransitionDocumentRequest(request.status, input.decision)) {
      throw new BadRequestException(
        `«${DOCUMENT_REQUEST_STATUS_LABELS[request.status]}» төлөвтэй хүсэлтийг «${DOCUMENT_REQUEST_STATUS_LABELS[input.decision]}» болгох боломжгүй`,
      );
    }

    const isFinalDecision = input.decision !== 'UNDER_REVIEW';
    const moved = await this.prisma.documentRequest.updateMany({
      where: { id, status: request.status },
      data: {
        status: input.decision,
        reviewedById: user.id,
        reviewedAt: isFinalDecision ? new Date() : null,
        rejectionReason: input.decision === 'REJECTED' ? reason : null,
      },
    });
    if (moved.count === 0) throw new ConflictException('Хүсэлтийн төлөв өөрчлөгдсөн байна. Хуудсаа шинэчилнэ үү');
    const updated = await this.prisma.documentRequest.findUniqueOrThrow({ where: { id }, include: this.includeFor(user) });

    if (input.decision !== 'UNDER_REVIEW') {
      const event: DocumentRequestReviewedEvent = {
        caseRef: caseRef(request.caseId, request.case),
        actorId: user.id,
        request: { id, title: request.title },
        decision: input.decision,
        rejectionReason: input.decision === 'REJECTED' ? reason : null,
      };
      await this.events.emitAsync(DOCUMENT_REQUEST_EVENTS.reviewed, event);
    }
    return updated;
  }

  // ─── helpers ───────────────────────────────────────────────────────────────

  private includeFor(user: RequestUser) {
    return {
      requestedBy: { select: PUBLIC_USER_SELECT },
      reviewedBy: { select: PUBLIC_USER_SELECT },
      documents: {
        select: DOCUMENT_SELECT,
        where: user.role === Role.CLIENT ? { isVisibleToClient: true } : {},
        orderBy: { createdAt: 'desc' as const },
      },
    } satisfies Prisma.DocumentRequestInclude;
  }

  private async load(id: string) {
    const request = await this.prisma.documentRequest.findUnique({
      where: { id },
      include: { case: { select: CASE_REF_SELECT }, _count: { select: { documents: true } } },
    });
    if (!request) throw new NotFoundException('Баримтын хүсэлт олдсонгүй');
    return request;
  }

  private async loadForStaff(id: string, user: RequestUser) {
    const request = await this.load(id);
    this.cases.assertStaffAccess(request.case, user);
    return request;
  }
}
