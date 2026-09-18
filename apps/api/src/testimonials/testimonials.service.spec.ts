import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import type { EventEmitter2 } from '@nestjs/event-emitter';
import { ADMIN_USER, CLIENT_USER, OTHER_CLIENT, createPrismaMock, type PrismaMock } from '../common/testing/mocks';
import type { PrismaService } from '../prisma/prisma.service';
import { TestimonialsService } from './testimonials.service';

const BODY = 'Хэргийг маань эхнээс нь дуустал тайлбарлаж, шүүхэд төлөөлж өгсөнд баярлалаа. Асуулт бүрд тайван хариулсан.';

const closedCase = (overrides: Record<string, unknown> = {}) => ({
  id: 'case-1',
  caseNumber: 'LF-2026-0001',
  status: 'CLOSED',
  clientId: CLIENT_USER.id,
  type: 'CIVIL',
  ...overrides,
});

const stored = (overrides: Record<string, unknown> = {}) => ({
  id: 't-1',
  authorName: 'Сүх Ганбат',
  authorTitle: null,
  body: BODY,
  rating: 5,
  caseType: 'CIVIL',
  status: 'PENDING',
  source: 'PORTAL',
  consentGiven: true,
  consentedAt: new Date('2026-09-18T01:00:00Z'),
  consentNote: 'Порталаас баталсан',
  displayOrder: 0,
  isFeatured: false,
  publishedAt: null,
  createdAt: new Date('2026-09-18T01:00:00Z'),
  updatedAt: new Date('2026-09-18T01:00:00Z'),
  authorUserId: CLIENT_USER.id,
  authorUser: { id: CLIENT_USER.id, firstName: 'Ганбат', lastName: 'Сүх', email: CLIENT_USER.email },
  case: { id: 'case-1', caseNumber: 'LF-2026-0001', title: 'Түрээсийн маргаан', type: 'CIVIL' },
  approvedBy: null,
  ...overrides,
});

describe('TestimonialsService', () => {
  let prisma: PrismaMock;
  let events: { emit: jest.Mock };
  let service: TestimonialsService;

  beforeEach(() => {
    prisma = createPrismaMock();
    events = { emit: jest.fn() };
    service = new TestimonialsService(prisma as unknown as PrismaService, events as unknown as EventEmitter2);
  });

  describe('the public list', () => {
    it('returns published rows only, and never the author id, the case or the consent note', async () => {
      prisma.testimonial.findMany.mockResolvedValue([
        { id: 't-1', authorName: 'Сүх Ганбат', authorTitle: null, body: BODY, rating: 5, caseType: 'CIVIL', publishedAt: new Date() },
      ]);

      const result = await service.findPublic({ limit: 12 });

      const [args] = prisma.testimonial.findMany.mock.calls[0] as [{ where: Record<string, unknown>; select: Record<string, boolean> }];
      expect(args.where).toMatchObject({ status: 'PUBLISHED' });
      // The select is the contract: anything identifying stays out of it.
      expect(Object.keys(args.select).sort()).toEqual(['authorName', 'authorTitle', 'body', 'caseType', 'id', 'publishedAt', 'rating']);
      for (const field of ['authorUserId', 'caseId', 'case', 'authorUser', 'consentNote', 'consentGiven', 'status']) {
        expect(args.select).not.toHaveProperty(field);
        expect(result[0]).not.toHaveProperty(field);
      }
    });

    it('filters by case type and by the featured flag', async () => {
      prisma.testimonial.findMany.mockResolvedValue([]);

      await service.findPublic({ caseType: 'FAMILY', featured: true, limit: 3 });

      expect(prisma.testimonial.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: 'PUBLISHED', caseType: 'FAMILY', isFeatured: true }, take: 3 }),
      );
    });
  });

  describe('a client writing about their own case', () => {
    it('stores a PENDING row with the consent recorded and notifies staff', async () => {
      prisma.case.findUnique.mockResolvedValue(closedCase());
      prisma.user.findUniqueOrThrow.mockResolvedValue({ firstName: 'Ганбат', lastName: 'Сүх' });
      prisma.testimonial.create.mockResolvedValue(stored());

      const result = await service.create({ caseId: 'case-1', body: BODY, rating: 5, consentGiven: true }, CLIENT_USER);

      expect(prisma.testimonial.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            authorName: 'Сүх Ганбат',
            status: 'PENDING',
            source: 'PORTAL',
            authorUserId: CLIENT_USER.id,
            caseId: 'case-1',
            caseType: 'CIVIL',
            consentGiven: true,
            consentNote: 'Порталаас баталсан',
          }),
        }),
      );
      expect(result).toMatchObject({ status: 'PENDING' });
      expect(events.emit).toHaveBeenCalledWith('testimonial.created', {
        testimonial: { id: 't-1', authorName: 'Сүх Ганбат', authorUserId: CLIENT_USER.id, caseNumber: 'LF-2026-0001' },
      });
    });

    it('refuses another client’s case and a case that is still open', async () => {
      prisma.case.findUnique.mockResolvedValue(closedCase());
      await expect(service.create({ caseId: 'case-1', body: BODY, consentGiven: true }, OTHER_CLIENT)).rejects.toBeInstanceOf(ForbiddenException);

      prisma.case.findUnique.mockResolvedValue(closedCase({ status: 'IN_PROGRESS' }));
      await expect(service.create({ caseId: 'case-1', body: BODY, consentGiven: true }, CLIENT_USER)).rejects.toBeInstanceOf(BadRequestException);

      prisma.case.findUnique.mockResolvedValue(null);
      await expect(service.create({ caseId: 'case-1', body: BODY, consentGiven: true }, CLIENT_USER)).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.testimonial.create).not.toHaveBeenCalled();
    });

    it('answers 409 when the same client writes about the same case twice', async () => {
      prisma.case.findUnique.mockResolvedValue(closedCase());
      prisma.user.findUniqueOrThrow.mockResolvedValue({ firstName: 'Ганбат', lastName: 'Сүх' });
      prisma.testimonial.create.mockRejectedValue(Object.assign(new Error('unique'), { code: 'P2002' }));

      await expect(service.create({ caseId: 'case-1', body: BODY, consentGiven: true }, CLIENT_USER)).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('publishing', () => {
    it('is refused without consent, whatever the request says', async () => {
      prisma.testimonial.findUnique.mockResolvedValue({
        id: 't-1',
        status: 'PENDING',
        consentGiven: false,
        consentNote: null,
        authorName: 'Сүх Ганбат',
        authorUserId: CLIENT_USER.id,
        case: { caseNumber: 'LF-2026-0001' },
      });

      await expect(service.update('t-1', { status: 'PUBLISHED' }, ADMIN_USER)).rejects.toThrow(
        'Харилцагчийн зөвшөөрөлгүйгээр сэтгэгдлийг нийтлэх боломжгүй',
      );
      expect(prisma.testimonial.update).not.toHaveBeenCalled();
    });

    it('is refused when consent is granted but how it was obtained is not recorded', async () => {
      prisma.testimonial.findUnique.mockResolvedValue({
        id: 't-1',
        status: 'PENDING',
        consentGiven: false,
        consentNote: null,
        authorName: 'Болд Дорж',
        authorUserId: null,
        case: null,
      });

      await expect(service.update('t-1', { status: 'PUBLISHED', consentGiven: true }, ADMIN_USER)).rejects.toThrow(
        'Зөвшөөрлийг хэрхэн авсныг тэмдэглэнэ үү',
      );
      expect(prisma.testimonial.update).not.toHaveBeenCalled();
    });

    it('goes through once consent is on record, stamps publishedAt and notifies the author', async () => {
      prisma.testimonial.findUnique.mockResolvedValue({
        id: 't-1',
        status: 'PENDING',
        consentGiven: true,
        consentNote: 'Порталаас баталсан',
        authorName: 'Сүх Ганбат',
        authorUserId: CLIENT_USER.id,
        case: { caseNumber: 'LF-2026-0001' },
      });
      prisma.testimonial.update.mockResolvedValue(stored({ status: 'PUBLISHED', publishedAt: new Date() }));

      await service.update('t-1', { status: 'PUBLISHED' }, ADMIN_USER);

      const [args] = prisma.testimonial.update.mock.calls[0] as [{ data: Record<string, unknown> }];
      expect(args.data.status).toBe('PUBLISHED');
      expect(args.data.publishedAt).toBeInstanceOf(Date);
      expect(args.data.approvedBy).toEqual({ connect: { id: ADMIN_USER.id } });
      expect(events.emit).toHaveBeenCalledWith(
        'testimonial.published',
        expect.objectContaining({ testimonial: expect.objectContaining({ id: 't-1' }), actorId: ADMIN_USER.id }),
      );
    });

    it('unpublishing clears the publish date and the featured flag', async () => {
      prisma.testimonial.findUnique.mockResolvedValue({
        id: 't-1',
        status: 'PUBLISHED',
        consentGiven: true,
        consentNote: 'Порталаас баталсан',
        authorName: 'Сүх Ганбат',
        authorUserId: CLIENT_USER.id,
        case: null,
      });
      prisma.testimonial.update.mockResolvedValue(stored({ status: 'REJECTED' }));

      await service.update('t-1', { status: 'REJECTED' }, ADMIN_USER);

      const [args] = prisma.testimonial.update.mock.calls[0] as [{ data: Record<string, unknown> }];
      expect(args.data).toMatchObject({ status: 'REJECTED', publishedAt: null, isFeatured: false });
      expect(events.emit).toHaveBeenCalledWith('testimonial.rejected', expect.anything());
    });
  });

  describe('a manual row', () => {
    it('needs a consent note as soon as consent is ticked', async () => {
      await expect(
        service.createManual(
          { authorName: 'Болд Дорж', body: BODY, consentGiven: true, isFeatured: false, displayOrder: 0 },
          ADMIN_USER,
        ),
      ).rejects.toThrow('Зөвшөөрлийг хэрхэн авсныг тэмдэглэнэ үү');
      expect(prisma.testimonial.create).not.toHaveBeenCalled();
    });

    it('is stored as PENDING and MANUAL', async () => {
      prisma.testimonial.create.mockResolvedValue(stored({ source: 'MANUAL', authorUserId: null, authorUser: null, case: null }));

      await service.createManual(
        { authorName: 'Болд Дорж', authorTitle: 'ХХК-ийн захирал', body: BODY, consentGiven: true, consentNote: '2026-09-20-нд и-мэйлээр', isFeatured: true, displayOrder: 1 },
        ADMIN_USER,
      );

      expect(prisma.testimonial.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ source: 'MANUAL', status: 'PENDING', consentGiven: true, consentNote: '2026-09-20-нд и-мэйлээр', isFeatured: true }),
        }),
      );
    });
  });

  describe('taking consent back', () => {
    it('clears the consent, returns the row to PENDING and takes it off the site', async () => {
      prisma.testimonial.findUnique.mockResolvedValue({ id: 't-1', authorUserId: CLIENT_USER.id });
      prisma.testimonial.update.mockResolvedValue(stored({ consentGiven: false }));

      await service.revokeConsent('t-1', CLIENT_USER);

      expect(prisma.testimonial.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ consentGiven: false, consentedAt: null, status: 'PENDING', publishedAt: null, isFeatured: false }),
        }),
      );
    });

    it('is refused for someone else’s testimonial', async () => {
      prisma.testimonial.findUnique.mockResolvedValue({ id: 't-1', authorUserId: CLIENT_USER.id });

      await expect(service.revokeConsent('t-1', OTHER_CLIENT)).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.testimonial.update).not.toHaveBeenCalled();
    });
  });
});
