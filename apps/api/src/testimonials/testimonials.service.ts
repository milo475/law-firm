import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  CaseStatus,
  Role,
  TestimonialSource,
  TestimonialStatus,
  type CreateManualTestimonialInput,
  type CreateTestimonialInput,
  type Paginated,
  type Prisma,
  type PublicTestimonial,
  type PublicTestimonialQueryInput,
  type TestimonialQueryInput,
  type UpdateTestimonialInput,
} from '@law-firm/shared';
import type { RequestUser } from '../common/types/request-user';
import { isUniqueViolation } from '../common/utils/format';
import { paginate, skipTake } from '../common/utils/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { TESTIMONIAL_EVENTS, type TestimonialCreatedEvent, type TestimonialRef, type TestimonialReviewedEvent } from './testimonial.events';

/**
 * The only fields the public endpoint returns. `authorUserId`, `caseId`, the consent note and
 * everything on the related user stay inside the admin API — a testimonial must never be a way to
 * learn who is a client of the firm beyond the name that person agreed to show.
 */
const PUBLIC_SELECT = {
  id: true,
  authorName: true,
  authorTitle: true,
  body: true,
  rating: true,
  caseType: true,
  publishedAt: true,
} satisfies Prisma.TestimonialSelect;

/** Staff view: adds the workflow fields and the case the testimonial belongs to. */
const ADMIN_SELECT = {
  ...PUBLIC_SELECT,
  status: true,
  source: true,
  consentGiven: true,
  consentedAt: true,
  consentNote: true,
  displayOrder: true,
  isFeatured: true,
  createdAt: true,
  updatedAt: true,
  authorUserId: true,
  authorUser: { select: { id: true, firstName: true, lastName: true, email: true } },
  case: { select: { id: true, caseNumber: true, title: true, type: true } },
  approvedBy: { select: { id: true, firstName: true, lastName: true } },
} satisfies Prisma.TestimonialSelect;

/** What the author sees about their own testimonial in the portal (no reviewer, no consent note). */
const MINE_SELECT = {
  ...PUBLIC_SELECT,
  status: true,
  consentGiven: true,
  createdAt: true,
  case: { select: { id: true, caseNumber: true, title: true } },
} satisfies Prisma.TestimonialSelect;

type AdminRecord = Prisma.TestimonialGetPayload<{ select: typeof ADMIN_SELECT }>;

@Injectable()
export class TestimonialsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
  ) {}

  /** Public: published testimonials only, featured first, then by display order. */
  async findPublic(query: PublicTestimonialQueryInput): Promise<PublicTestimonial[]> {
    const rows = await this.prisma.testimonial.findMany({
      where: {
        status: TestimonialStatus.PUBLISHED,
        ...(query.caseType ? { caseType: query.caseType } : {}),
        ...(query.featured ? { isFeatured: true } : {}),
      },
      select: PUBLIC_SELECT,
      orderBy: [{ isFeatured: 'desc' }, { displayOrder: 'asc' }, { publishedAt: 'desc' }],
      take: query.limit,
    });
    return rows;
  }

  /**
   * CLIENT: a testimonial about one of their own closed cases. It starts as PENDING — consent is
   * recorded here, but staff still review the text before it appears anywhere.
   */
  async create(input: CreateTestimonialInput, user: RequestUser) {
    const record = await this.prisma.case.findUnique({
      where: { id: input.caseId },
      select: { id: true, caseNumber: true, status: true, clientId: true, type: true },
    });
    if (!record) throw new NotFoundException('Хэрэг олдсонгүй');
    if (record.clientId !== user.id) throw new ForbiddenException('Энэ хэрэгт сэтгэгдэл үлдээх эрх танд байхгүй байна');
    if (record.status !== CaseStatus.CLOSED) throw new BadRequestException('Хэрэг хаагдсаны дараа сэтгэгдэл үлдээх боломжтой');

    const author = await this.prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { firstName: true, lastName: true } });
    const now = new Date();
    try {
      const created = await this.prisma.testimonial.create({
        data: {
          authorName: `${author.lastName} ${author.firstName}`.trim(),
          body: input.body,
          rating: input.rating ?? null,
          caseType: record.type,
          status: TestimonialStatus.PENDING,
          source: TestimonialSource.PORTAL,
          authorUserId: user.id,
          caseId: record.id,
          consentGiven: input.consentGiven,
          consentedAt: now,
          consentNote: 'Порталаас баталсан',
        },
        select: MINE_SELECT,
      });
      this.events.emit(TESTIMONIAL_EVENTS.created, {
        testimonial: { id: created.id, authorName: created.authorName, authorUserId: user.id, caseNumber: record.caseNumber },
      } satisfies TestimonialCreatedEvent);
      return created;
    } catch (error) {
      if (isUniqueViolation(error)) throw new ConflictException('Энэ хэрэгт сэтгэгдэл аль хэдийн үлдээсэн байна');
      throw error;
    }
  }

  /** CLIENT: their own testimonials with the current status. */
  findMine(user: RequestUser) {
    return this.prisma.testimonial.findMany({
      where: { authorUserId: user.id },
      select: MINE_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * CLIENT: take the permission back. The row returns to PENDING with the consent cleared, so the
   * public endpoint stops returning it immediately and staff cannot publish it again as it stands.
   */
  async revokeConsent(id: string, user: RequestUser) {
    const record = await this.prisma.testimonial.findUnique({ where: { id }, select: { id: true, authorUserId: true } });
    if (!record) throw new NotFoundException('Сэтгэгдэл олдсонгүй');
    if (record.authorUserId !== user.id) throw new ForbiddenException('Энэ сэтгэгдлийг өөрчлөх эрх танд байхгүй байна');
    return this.prisma.testimonial.update({
      where: { id },
      data: {
        consentGiven: false,
        consentedAt: null,
        consentNote: 'Харилцагч порталаас зөвшөөрлөө цуцалсан',
        status: TestimonialStatus.PENDING,
        publishedAt: null,
        isFeatured: false,
      },
      select: MINE_SELECT,
    });
  }

  /** Staff: every testimonial, unreviewed first. */
  async findAll(query: TestimonialQueryInput): Promise<Paginated<AdminRecord>> {
    const where: Prisma.TestimonialWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.source ? { source: query.source } : {}),
      ...(query.caseType ? { caseType: query.caseType } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.testimonial.findMany({
        where,
        select: ADMIN_SELECT,
        // PENDING (0) first, then the newest.
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
        ...skipTake(query.page, query.limit),
      }),
      this.prisma.testimonial.count({ where }),
    ]);
    return paginate(items, total, query.page, query.limit);
  }

  /** Staff: counts behind the sidebar badge. */
  async summary(): Promise<{ pending: number; published: number }> {
    const [pending, published] = await Promise.all([
      this.prisma.testimonial.count({ where: { status: TestimonialStatus.PENDING } }),
      this.prisma.testimonial.count({ where: { status: TestimonialStatus.PUBLISHED } }),
    ]);
    return { pending, published };
  }

  async findOne(id: string): Promise<AdminRecord> {
    const record = await this.prisma.testimonial.findUnique({ where: { id }, select: ADMIN_SELECT });
    if (!record) throw new NotFoundException('Сэтгэгдэл олдсонгүй');
    return record;
  }

  /** Staff: type in a testimonial that arrived by e-mail, Facebook or word of mouth. */
  async createManual(input: CreateManualTestimonialInput, user: RequestUser) {
    const consentGiven = input.consentGiven === true;
    if (consentGiven && !input.consentNote) {
      throw new BadRequestException('Зөвшөөрлийг хэрхэн авсныг тэмдэглэнэ үү');
    }
    return this.prisma.testimonial.create({
      data: {
        authorName: input.authorName,
        authorTitle: input.authorTitle || null,
        body: input.body,
        rating: input.rating ?? null,
        caseType: input.caseType ?? null,
        status: TestimonialStatus.PENDING,
        source: TestimonialSource.MANUAL,
        consentGiven,
        consentedAt: consentGiven ? new Date() : null,
        consentNote: input.consentNote || null,
        isFeatured: input.isFeatured,
        displayOrder: input.displayOrder,
        approvedById: user.id,
      },
      select: ADMIN_SELECT,
    });
  }

  /**
   * Staff: edit, reorder, feature, change the status.
   *
   * Publishing is the one guarded step: a row only becomes PUBLISHED when consent is on record,
   * whether it was already stored or is being set in the same request. The check lives here rather
   * than in the admin UI so no other caller can get around it.
   */
  async update(id: string, input: UpdateTestimonialInput, user: RequestUser) {
    const current = await this.prisma.testimonial.findUnique({
      where: { id },
      select: { id: true, status: true, consentGiven: true, consentNote: true, authorName: true, authorUserId: true, case: { select: { caseNumber: true } } },
    });
    if (!current) throw new NotFoundException('Сэтгэгдэл олдсонгүй');

    const consentGiven = input.consentGiven ?? current.consentGiven;
    const consentNote = input.consentNote !== undefined ? input.consentNote : current.consentNote;
    const status = input.status ?? current.status;
    const publishing = status === TestimonialStatus.PUBLISHED;

    if (publishing && !consentGiven) {
      throw new BadRequestException('Харилцагчийн зөвшөөрөлгүйгээр сэтгэгдлийг нийтлэх боломжгүй');
    }
    if (publishing && !consentNote) {
      throw new BadRequestException('Зөвшөөрлийг хэрхэн авсныг тэмдэглэнэ үү');
    }

    const wasPublished = current.status === TestimonialStatus.PUBLISHED;
    const data: Prisma.TestimonialUpdateInput = {
      ...(input.authorName !== undefined ? { authorName: input.authorName } : {}),
      ...(input.authorTitle !== undefined ? { authorTitle: input.authorTitle } : {}),
      ...(input.body !== undefined ? { body: input.body } : {}),
      ...(input.rating !== undefined ? { rating: input.rating } : {}),
      ...(input.caseType !== undefined ? { caseType: input.caseType } : {}),
      ...(input.displayOrder !== undefined ? { displayOrder: input.displayOrder } : {}),
      ...(input.isFeatured !== undefined ? { isFeatured: input.isFeatured } : {}),
      ...(input.consentGiven !== undefined ? { consentGiven, consentedAt: consentGiven ? new Date() : null } : {}),
      ...(input.consentNote !== undefined ? { consentNote: input.consentNote } : {}),
      ...(input.status !== undefined ? { status } : {}),
      ...(publishing ? { publishedAt: wasPublished ? undefined : new Date(), approvedBy: { connect: { id: user.id } } } : {}),
      // Leaving PUBLISHED takes it off the site; a featured row must not linger in the home block.
      ...(!publishing && wasPublished ? { publishedAt: null, isFeatured: false } : {}),
    };

    const updated = await this.prisma.testimonial.update({ where: { id }, data, select: ADMIN_SELECT });

    if (input.status && input.status !== current.status) {
      const ref: TestimonialRef = {
        id: updated.id,
        authorName: updated.authorName,
        authorUserId: updated.authorUserId,
        caseNumber: updated.case?.caseNumber ?? null,
      };
      if (input.status === TestimonialStatus.PUBLISHED) {
        this.events.emit(TESTIMONIAL_EVENTS.published, { testimonial: ref, actorId: user.id } satisfies TestimonialReviewedEvent);
      } else if (input.status === TestimonialStatus.REJECTED) {
        this.events.emit(TESTIMONIAL_EVENTS.rejected, { testimonial: ref, actorId: user.id } satisfies TestimonialReviewedEvent);
      }
    }
    return updated;
  }

  async remove(id: string): Promise<{ id: string }> {
    const record = await this.prisma.testimonial.findUnique({ where: { id }, select: { id: true } });
    if (!record) throw new NotFoundException('Сэтгэгдэл олдсонгүй');
    await this.prisma.testimonial.delete({ where: { id } });
    return { id };
  }

  /** Staff view of one client's own row, used by the portal case page to know whether to offer the form. */
  async findMineForCase(caseId: string, user: RequestUser) {
    if (user.role !== Role.CLIENT) return null;
    return this.prisma.testimonial.findFirst({ where: { caseId, authorUserId: user.id }, select: MINE_SELECT });
  }
}
