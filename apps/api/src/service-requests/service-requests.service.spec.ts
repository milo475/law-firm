import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import type { EventEmitter2 } from '@nestjs/event-emitter';
import { CasesService } from '../cases/cases.service';
import { ADMIN_USER, CLIENT_USER, LAWYER_USER, OTHER_CLIENT, OTHER_LAWYER, createPrismaMock, type PrismaMock } from '../common/testing/mocks';
import type { PrismaService } from '../prisma/prisma.service';
import { ServiceRequestsService } from './service-requests.service';

const TITLE = 'Түрээсийн гэрээний маргаан';
const DESCRIPTION = 'Түрээслэгч гурван сар төлбөрөө төлөөгүй, гэрээг цуцлах талаар зөвлөгөө хэрэгтэй байна.';
const THIRD_LAWYER = 'third-lawyer-id';

/** A request as REQUEST_SELECT returns it. */
const record = (overrides: Record<string, unknown> = {}) => ({
  id: 'sr-1',
  type: 'LAWYER',
  caseType: 'CIVIL',
  title: TITLE,
  description: DESCRIPTION,
  status: 'NEW',
  reviewedAt: null,
  rejectionReason: null,
  assignedCaseId: null,
  createdAt: new Date('2026-09-15T01:00:00Z'),
  updatedAt: new Date('2026-09-15T01:00:00Z'),
  requester: { id: CLIENT_USER.id, firstName: 'Ганбат', lastName: 'Сүх', email: CLIENT_USER.email, phone: '88110001', avatarUrl: null },
  reviewedBy: null,
  assignedCase: null,
  ...overrides,
});

/** The pre-check assign loads before opening the case. */
const toAssign = (overrides: Record<string, unknown> = {}) => ({
  id: 'sr-1',
  status: 'ACCEPTED',
  title: TITLE,
  description: DESCRIPTION,
  caseType: 'CIVIL',
  requesterId: CLIENT_USER.id,
  requester: { isActive: true },
  ...overrides,
});

describe('ServiceRequestsService', () => {
  let prisma: PrismaMock;
  let events: { emit: jest.Mock };
  let cases: CasesService;
  let service: ServiceRequestsService;

  beforeEach(() => {
    prisma = createPrismaMock();
    events = { emit: jest.fn() };
    cases = new CasesService(prisma as unknown as PrismaService);
    service = new ServiceRequestsService(prisma as unknown as PrismaService, cases, events as unknown as EventEmitter2);
  });

  describe('create and read', () => {
    it('a client creates a NEW request for themselves and the created event is emitted', async () => {
      prisma.serviceRequest.create.mockResolvedValue(record());

      const result = await service.create({ type: 'LAWYER', caseType: 'CIVIL', title: TITLE, description: DESCRIPTION }, CLIENT_USER);

      expect(prisma.serviceRequest.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: { requesterId: CLIENT_USER.id, type: 'LAWYER', caseType: 'CIVIL', title: TITLE, description: DESCRIPTION } }),
      );
      expect(result).toMatchObject({ status: 'NEW', reviewedBy: null });
      expect(events.emit).toHaveBeenCalledWith('service-request.created', {
        request: { id: 'sr-1', title: TITLE, type: 'LAWYER', requesterId: CLIENT_USER.id, requesterName: 'С. Ганбат' },
      });
    });

    it('a client lists only their own requests and never sees which admin reviewed them', async () => {
      const reviewer = { id: ADMIN_USER.id, firstName: 'Батболд', lastName: 'Дорж', avatarUrl: null };
      prisma.serviceRequest.findMany.mockResolvedValue([record({ status: 'REJECTED', rejectionReason: 'Манай чиглэл биш', reviewedBy: reviewer })]);
      prisma.serviceRequest.count.mockResolvedValue(1);

      const page = await service.findMine({ page: 1, limit: 20 }, CLIENT_USER);

      expect(prisma.serviceRequest.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { requesterId: CLIENT_USER.id } }));
      expect(page.items[0]).toMatchObject({ rejectionReason: 'Манай чиглэл биш', reviewedBy: null });
    });

    it('another client gets 403, a missing request 404, and the admin can open any request', async () => {
      prisma.serviceRequest.findUnique.mockResolvedValue(record());
      await expect(service.findOne('sr-1', OTHER_CLIENT)).rejects.toBeInstanceOf(ForbiddenException);
      await expect(service.findOne('sr-1', CLIENT_USER)).resolves.toMatchObject({ id: 'sr-1' });
      await expect(service.findOne('sr-1', ADMIN_USER)).resolves.toMatchObject({ id: 'sr-1' });

      prisma.serviceRequest.findUnique.mockResolvedValue(null);
      await expect(service.findOne('missing', ADMIN_USER)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('the admin list filters by status, type and case type, newest first', async () => {
      prisma.serviceRequest.findMany.mockResolvedValue([]);
      prisma.serviceRequest.count.mockResolvedValue(0);

      await service.findAll({ page: 2, limit: 10, status: 'NEW', type: 'CONSULTATION', caseType: 'LABOR' });

      expect(prisma.serviceRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: 'NEW', type: 'CONSULTATION', caseType: 'LABOR' }, orderBy: { createdAt: 'desc' }, skip: 10, take: 10 }),
      );
    });
  });

  describe('accept and reject', () => {
    it('ADMIN accepts a NEW request: the update is guarded by the status and records the reviewer', async () => {
      prisma.serviceRequest.updateMany.mockResolvedValue({ count: 1 });
      prisma.serviceRequest.findUnique.mockResolvedValue(record({ status: 'ACCEPTED' }));

      await expect(service.accept('sr-1', ADMIN_USER)).resolves.toMatchObject({ status: 'ACCEPTED' });

      expect(prisma.serviceRequest.updateMany).toHaveBeenCalledWith({
        where: { id: 'sr-1', status: { in: ['NEW'] } },
        data: { status: 'ACCEPTED', reviewedById: ADMIN_USER.id, reviewedAt: expect.any(Date) },
      });
      expect(events.emit).toHaveBeenCalledWith('service-request.accepted', expect.objectContaining({ actorId: ADMIN_USER.id }));
    });

    it('accepting a request that is no longer NEW is 400 and nobody is notified', async () => {
      prisma.serviceRequest.updateMany.mockResolvedValue({ count: 0 });
      prisma.serviceRequest.findUnique.mockResolvedValue({ status: 'REJECTED' });

      await expect(service.accept('sr-1', ADMIN_USER)).rejects.toThrow('Татгалзсан хүсэлтийг өөрчлөх боломжгүй');
      expect(events.emit).not.toHaveBeenCalled();
    });

    it('accepting a missing request is 404', async () => {
      prisma.serviceRequest.updateMany.mockResolvedValue({ count: 0 });
      prisma.serviceRequest.findUnique.mockResolvedValue(null);
      await expect(service.accept('missing', ADMIN_USER)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('ADMIN rejects a NEW or ACCEPTED request with the reason, and the rejected event carries it', async () => {
      const reason = 'Энэ чиглэлээр үйлчилгээ үзүүлдэггүй';
      prisma.serviceRequest.updateMany.mockResolvedValue({ count: 1 });
      prisma.serviceRequest.findUnique.mockResolvedValue(record({ status: 'REJECTED', rejectionReason: reason }));

      await service.reject('sr-1', { rejectionReason: reason }, ADMIN_USER);

      expect(prisma.serviceRequest.updateMany).toHaveBeenCalledWith({
        where: { id: 'sr-1', status: { in: ['NEW', 'ACCEPTED'] } },
        data: expect.objectContaining({ status: 'REJECTED', rejectionReason: reason, reviewedById: ADMIN_USER.id }),
      });
      expect(events.emit).toHaveBeenCalledWith('service-request.rejected', expect.objectContaining({ reason, actorId: ADMIN_USER.id }));
    });

    it('a request that already became a case cannot be rejected (400)', async () => {
      prisma.serviceRequest.updateMany.mockResolvedValue({ count: 0 });
      prisma.serviceRequest.findUnique.mockResolvedValue({ status: 'CONVERTED' });

      await expect(service.reject('sr-1', { rejectionReason: 'Хоцорсон шийдвэр' }, ADMIN_USER)).rejects.toThrow('Энэ хүсэлтээр хэрэг аль хэдийн нээгдсэн байна');
      expect(events.emit).not.toHaveBeenCalled();
    });
  });

  describe('assign', () => {
    const openedCase = { id: 'case-9', caseNumber: 'LF-2026-0009', title: TITLE };

    const arrange = (precheck = toAssign(), lawyersFound = 1) => {
      prisma.serviceRequest.findUnique.mockResolvedValueOnce(precheck).mockResolvedValue(record({ status: 'CONVERTED', assignedCaseId: 'case-9' }));
      prisma.user.count.mockResolvedValue(lawyersFound);
      prisma.case.findFirst.mockResolvedValue(null);
      prisma.serviceRequest.updateMany.mockResolvedValue({ count: 1 });
      prisma.case.create.mockResolvedValue(openedCase);
      prisma.serviceRequest.update.mockResolvedValue({});
    };

    it('one lawyer: the case belongs to the requester, the lawyer leads it, and the request turns CONVERTED with the case linked', async () => {
      arrange();

      await expect(service.assign('sr-1', { lawyerId: LAWYER_USER.id }, ADMIN_USER)).resolves.toMatchObject({ status: 'CONVERTED', assignedCaseId: 'case-9' });

      expect(prisma.serviceRequest.updateMany).toHaveBeenCalledWith({
        where: { id: 'sr-1', status: 'ACCEPTED' },
        data: { status: 'CONVERTED', reviewedById: ADMIN_USER.id, reviewedAt: expect.any(Date) },
      });
      const { data } = prisma.case.create.mock.calls[0][0];
      expect(data).toMatchObject({
        clientId: CLIENT_USER.id,
        lawyerId: LAWYER_USER.id,
        type: 'CIVIL',
        status: 'NEW',
        title: TITLE,
        description: DESCRIPTION,
        caseNumber: expect.stringMatching(/^LF-\d{4}-0001$/),
      });
      expect(data.members.create).toEqual([{ userId: LAWYER_USER.id, role: 'LEAD', addedById: ADMIN_USER.id }]);
      expect(prisma.serviceRequest.update).toHaveBeenCalledWith({ where: { id: 'sr-1' }, data: { assignedCaseId: 'case-9' } });
      expect(events.emit).toHaveBeenCalledWith(
        'service-request.assigned',
        expect.objectContaining({ caseRef: openedCase, leadId: LAWYER_USER.id, memberIds: [], actorId: ADMIN_USER.id }),
      );
    });

    it('a team: the lead is Case.lawyerId and the LEAD row, the others become MEMBER rows', async () => {
      arrange(toAssign(), 3);

      await service.assign('sr-1', { leadId: LAWYER_USER.id, memberIds: [OTHER_LAWYER.id, THIRD_LAWYER] }, ADMIN_USER);

      expect(prisma.user.count).toHaveBeenCalledWith({ where: { id: { in: [LAWYER_USER.id, OTHER_LAWYER.id, THIRD_LAWYER] }, role: 'LAWYER', isActive: true } });
      const { data } = prisma.case.create.mock.calls[0][0];
      expect(data.lawyerId).toBe(LAWYER_USER.id);
      expect(data.members.create).toEqual([
        { userId: LAWYER_USER.id, role: 'LEAD', addedById: ADMIN_USER.id },
        { userId: OTHER_LAWYER.id, role: 'MEMBER', addedById: ADMIN_USER.id },
        { userId: THIRD_LAWYER, role: 'MEMBER', addedById: ADMIN_USER.id },
      ]);
      expect(events.emit).toHaveBeenCalledWith('service-request.assigned', expect.objectContaining({ leadId: LAWYER_USER.id, memberIds: [OTHER_LAWYER.id, THIRD_LAWYER] }));
    });

    it('a NEW request has to be accepted first (400, no case)', async () => {
      prisma.serviceRequest.findUnique.mockResolvedValueOnce(toAssign({ status: 'NEW' }));

      await expect(service.assign('sr-1', { lawyerId: LAWYER_USER.id }, ADMIN_USER)).rejects.toThrow('Эхлээд хүсэлтийг хүлээж авна уу');
      expect(prisma.case.create).not.toHaveBeenCalled();
    });

    it('assigning twice is 400 and never opens a second case', async () => {
      prisma.serviceRequest.findUnique.mockResolvedValueOnce(toAssign({ status: 'CONVERTED' }));

      await expect(service.assign('sr-1', { lawyerId: LAWYER_USER.id }, ADMIN_USER)).rejects.toThrow('Энэ хүсэлтээр хэрэг аль хэдийн нээгдсэн байна');
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(prisma.case.create).not.toHaveBeenCalled();
    });

    it('a concurrent assign that loses the status check is 400 without a case', async () => {
      arrange();
      prisma.serviceRequest.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.assign('sr-1', { lawyerId: LAWYER_USER.id }, ADMIN_USER)).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.case.create).not.toHaveBeenCalled();
      expect(events.emit).not.toHaveBeenCalled();
    });

    it('an inactive or non-lawyer assignee is 400', async () => {
      arrange(toAssign(), 1);

      await expect(service.assign('sr-1', { leadId: LAWYER_USER.id, memberIds: [CLIENT_USER.id] }, ADMIN_USER)).rejects.toThrow(
        'Сонгосон өмгөөлөгч олдсонгүй эсвэл идэвхгүй байна',
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('a case number taken in the meantime is retried with the next one', async () => {
      arrange();
      prisma.case.create.mockRejectedValueOnce(Object.assign(new Error('Unique constraint failed'), { code: 'P2002' })).mockResolvedValue(openedCase);

      await expect(service.assign('sr-1', { lawyerId: LAWYER_USER.id }, ADMIN_USER)).resolves.toMatchObject({ status: 'CONVERTED' });
      expect(prisma.case.findFirst).toHaveBeenCalledTimes(2);
      expect(prisma.case.create).toHaveBeenCalledTimes(2);
    });

    it('after assign the team and the requester can open the case; other lawyers and clients cannot', async () => {
      arrange(toAssign(), 2);

      await service.assign('sr-1', { leadId: LAWYER_USER.id, memberIds: [OTHER_LAWYER.id] }, ADMIN_USER);

      const { data } = prisma.case.create.mock.calls[0][0];
      const opened = {
        clientId: data.clientId,
        lawyerId: data.lawyerId,
        members: data.members.create.map(({ userId, role }: { userId: string; role: 'LEAD' | 'MEMBER' }) => ({ userId, role })),
      };
      for (const allowed of [LAWYER_USER, OTHER_LAWYER, CLIENT_USER, ADMIN_USER]) {
        expect(() => cases.assertAccess(opened, allowed)).not.toThrow();
      }
      expect(() => cases.assertAccess(opened, OTHER_CLIENT)).toThrow(ForbiddenException);
      expect(() => cases.assertAccess(opened, { id: 'outsider-lawyer', email: 'outsider@lawfirm.mn', role: 'LAWYER' })).toThrow(ForbiddenException);
    });
  });

  describe('suggested lawyers', () => {
    const lawyer = (id: string, firstName: string, specializations: string[]) => ({
      id,
      firstName,
      lastName: 'Б',
      avatarUrl: null,
      lawyerProfile: { title: 'Хуульч', specializations },
    });

    it('lawyers specialised in the case type come back, the least busy first', async () => {
      prisma.serviceRequest.findUnique.mockResolvedValue({ caseType: 'FAMILY' });
      prisma.user.findMany.mockResolvedValue([
        lawyer('l1', 'Энхжаргал', ['Иргэний эрх зүй', 'Бизнесийн эрх зүй']),
        lawyer('l2', 'Оюунбилэг', ['Гэр бүлийн эрх зүй', 'Хөдөлмөрийн эрх зүй']),
        lawyer('l3', 'Тэмүүлэн', ['Гэр бүлийн маргаан']),
      ]);
      prisma.case.groupBy.mockResolvedValue([
        { lawyerId: 'l2', _count: { _all: 5 } },
        { lawyerId: 'l3', _count: { _all: 1 } },
      ]);

      const result = await service.suggestedLawyers('sr-1');

      expect(result.matched).toBe(true);
      expect(result.items.map((item) => item.id)).toEqual(['l3', 'l2']);
      expect(result.items[0]).toMatchObject({ openCases: 1, matches: true, specializations: ['Гэр бүлийн маргаан'] });
      expect(prisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { role: 'LAWYER', isActive: true } }));
    });

    it('when nobody specialises in it, every active lawyer is suggested', async () => {
      prisma.serviceRequest.findUnique.mockResolvedValue({ caseType: 'REAL_ESTATE' });
      prisma.user.findMany.mockResolvedValue([lawyer('l1', 'Энхжаргал', ['Иргэний эрх зүй']), lawyer('l2', 'Оюунбилэг', [])]);
      prisma.case.groupBy.mockResolvedValue([]);

      const result = await service.suggestedLawyers('sr-1');

      expect(result.matched).toBe(false);
      expect(result.items.map((item) => item.id)).toEqual(['l1', 'l2']);
    });
  });
});
