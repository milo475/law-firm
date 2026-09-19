import { BadRequestException, ConflictException, ForbiddenException, UnsupportedMediaTypeException } from '@nestjs/common';
import type { EventEmitter2 } from '@nestjs/event-emitter';
import { CasesService } from '../cases/cases.service';
import {
  ADMIN_USER,
  CLIENT_USER,
  LAWYER_USER,
  OTHER_CLIENT,
  OTHER_LAWYER,
  createPrismaMock,
  type PrismaMock,
} from '../common/testing/mocks';
import { DocumentsService } from '../documents/documents.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { DOCUMENT_REQUEST_EVENTS } from './document-request.events';
import { DocumentRequestsService } from './document-requests.service';

/** A real %PDF- header: uploads are checked against the file's bytes, not its declared type. */
const PDF_BYTES = Buffer.from('%PDF-1.7\n1 0 obj\n<< >>\nendobj\n');

const caseRecord = {
  id: 'case-1',
  caseNumber: 'LF-2026-0001',
  title: 'Түрээсийн маргаан',
  clientId: CLIENT_USER.id,
  lawyerId: LAWYER_USER.id,
  status: 'IN_PROGRESS',
};

const requestRow = (status: string, documents = 0) => ({
  id: 'req-1',
  caseId: 'case-1',
  title: 'Иргэний үнэмлэхний хуулбар',
  status,
  rejectionReason: status === 'REJECTED' ? 'Зураг бүдэг байна' : null,
  case: caseRecord,
  _count: { documents },
});

const PNG_BYTES = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(16)]);

const file = (name = 'unemleh.pdf', mimetype = 'application/pdf') => ({
  originalname: name,
  mimetype,
  size: 2048,
  buffer: mimetype === 'image/png' ? PNG_BYTES : PDF_BYTES,
});

describe('DocumentRequestsService', () => {
  let prisma: PrismaMock;
  let storage: { upload: jest.Mock; delete: jest.Mock; presignedGetUrl: jest.Mock };
  let events: { emitAsync: jest.Mock };
  let service: DocumentRequestsService;

  beforeEach(() => {
    prisma = createPrismaMock();
    storage = { upload: jest.fn().mockResolvedValue(undefined), delete: jest.fn().mockResolvedValue(undefined), presignedGetUrl: jest.fn() };
    events = { emitAsync: jest.fn().mockResolvedValue([]) };
    const cases = new CasesService(prisma as unknown as PrismaService);
    const documents = new DocumentsService(prisma as unknown as PrismaService, cases, storage as unknown as StorageService);
    service = new DocumentRequestsService(prisma as unknown as PrismaService, cases, documents, events as unknown as EventEmitter2);

    prisma.case.findUnique.mockResolvedValue(caseRecord);
    prisma.documentRequest.create.mockImplementation(async ({ data }: any) => ({ id: `req-${data.title}`, status: 'PENDING', ...data }));
    prisma.documentRequest.updateMany.mockResolvedValue({ count: 1 });
    prisma.documentRequest.findUniqueOrThrow.mockResolvedValue({ id: 'req-1', status: 'SUBMITTED', documents: [] });
    prisma.document.create.mockImplementation(async ({ data }: any) => ({ id: `doc-${data.name}`, ...data }));
  });

  describe('create', () => {
    const items = [
      { title: 'Иргэний үнэмлэхний хуулбар', isRequired: true, dueDate: new Date('2026-10-01T00:00:00Z') },
      { title: 'Банкны хуулга', description: '  Сүүлийн 6 сар ', isRequired: false },
    ];

    it('LAWYER on a case they do not handle → 403, nothing created, no event', async () => {
      await expect(service.create('case-1', { items }, OTHER_LAWYER)).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.documentRequest.create).not.toHaveBeenCalled();
      expect(events.emitAsync).not.toHaveBeenCalled();
    });

    it('CLIENT cannot create requests, even on their own case → 403', async () => {
      await expect(service.create('case-1', { items }, CLIENT_USER)).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.documentRequest.create).not.toHaveBeenCalled();
    });

    it('the assigned LAWYER creates a whole checklist at once and one created event is emitted', async () => {
      const created = await service.create('case-1', { items }, LAWYER_USER);

      expect(created).toHaveLength(2);
      expect(prisma.documentRequest.create.mock.calls.map(([arg]: any) => arg.data)).toEqual([
        expect.objectContaining({ caseId: 'case-1', requestedById: LAWYER_USER.id, title: 'Иргэний үнэмлэхний хуулбар', description: null, isRequired: true }),
        expect.objectContaining({ title: 'Банкны хуулга', description: 'Сүүлийн 6 сар', isRequired: false, dueDate: null }),
      ]);
      expect(events.emitAsync).toHaveBeenCalledWith(
        DOCUMENT_REQUEST_EVENTS.created,
        expect.objectContaining({
          caseRef: { id: 'case-1', caseNumber: 'LF-2026-0001', clientId: CLIENT_USER.id, lawyerId: LAWYER_USER.id },
          requests: [expect.objectContaining({ title: 'Иргэний үнэмлэхний хуулбар' }), expect.objectContaining({ title: 'Банкны хуулга' })],
        }),
      );
    });

    it('a closed case cannot receive new requests → 400', async () => {
      prisma.case.findUnique.mockResolvedValue({ ...caseRecord, status: 'CLOSED' });
      await expect(service.create('case-1', { items }, ADMIN_USER)).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('submit', () => {
    it("CLIENT submitting to another client's request → 403, nothing stored", async () => {
      prisma.documentRequest.findUnique.mockResolvedValue(requestRow('PENDING'));
      await expect(service.submit('req-1', [file()], OTHER_CLIENT)).rejects.toBeInstanceOf(ForbiddenException);
      expect(storage.upload).not.toHaveBeenCalled();
      expect(prisma.document.create).not.toHaveBeenCalled();
    });

    it('links every uploaded file to the request and moves it to SUBMITTED', async () => {
      prisma.documentRequest.findUnique.mockResolvedValue(requestRow('PENDING'));

      await service.submit('req-1', [file('a.pdf'), file('b.png', 'image/png')], CLIENT_USER);

      expect(storage.upload).toHaveBeenCalledTimes(2);
      expect(prisma.document.create.mock.calls.map(([arg]: any) => arg.data)).toEqual([
        expect.objectContaining({ name: 'a.pdf', caseId: 'case-1', requestId: 'req-1', uploadedById: CLIENT_USER.id, isVisibleToClient: true }),
        expect.objectContaining({ name: 'b.png', requestId: 'req-1', storageKey: expect.stringMatching(/^cases\/LF-2026-0001\/.+\.png$/) }),
      ]);
      expect(prisma.documentRequest.updateMany).toHaveBeenCalledWith({
        where: { id: 'req-1', status: 'PENDING' },
        data: { status: 'SUBMITTED', rejectionReason: null, reviewedById: null, reviewedAt: null },
      });
      expect(events.emitAsync).toHaveBeenCalledWith(
        DOCUMENT_REQUEST_EVENTS.submitted,
        expect.objectContaining({ request: { id: 'req-1', title: 'Иргэний үнэмлэхний хуулбар' }, fileCount: 2 }),
      );
    });

    it('APPROVED → SUBMITTED is not an allowed transition → 400, nothing stored', async () => {
      prisma.documentRequest.findUnique.mockResolvedValue(requestRow('APPROVED', 1));
      await expect(service.submit('req-1', [file()], CLIENT_USER)).rejects.toBeInstanceOf(BadRequestException);
      expect(storage.upload).not.toHaveBeenCalled();
      expect(prisma.documentRequest.updateMany).not.toHaveBeenCalled();
    });

    it('a REJECTED request can be submitted again and the old reason is cleared', async () => {
      prisma.documentRequest.findUnique.mockResolvedValue(requestRow('REJECTED', 1));
      await service.submit('req-1', [file('shine-hulga.pdf')], CLIENT_USER);
      expect(prisma.documentRequest.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'req-1', status: 'REJECTED' }, data: expect.objectContaining({ status: 'SUBMITTED', rejectionReason: null }) }),
      );
    });

    it('a submission without files → 400', async () => {
      prisma.documentRequest.findUnique.mockResolvedValue(requestRow('PENDING'));
      await expect(service.submit('req-1', [], CLIENT_USER)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('an unsupported file type → 415 before anything is stored', async () => {
      prisma.documentRequest.findUnique.mockResolvedValue(requestRow('PENDING'));
      await expect(service.submit('req-1', [file('run.exe', 'application/x-msdownload')], CLIENT_USER)).rejects.toBeInstanceOf(
        UnsupportedMediaTypeException,
      );
      expect(storage.upload).not.toHaveBeenCalled();
    });

    it('uploaded objects are removed again when the status changed concurrently → 409', async () => {
      prisma.documentRequest.findUnique.mockResolvedValue(requestRow('PENDING'));
      prisma.documentRequest.updateMany.mockResolvedValue({ count: 0 });
      await expect(service.submit('req-1', [file()], CLIENT_USER)).rejects.toBeInstanceOf(ConflictException);
      expect(storage.delete).toHaveBeenCalledTimes(1);
      expect(events.emitAsync).not.toHaveBeenCalled();
    });
  });

  describe('review', () => {
    it('REJECTED without a rejectionReason → 400', async () => {
      prisma.documentRequest.findUnique.mockResolvedValue(requestRow('SUBMITTED', 1));
      await expect(service.review('req-1', { decision: 'REJECTED', rejectionReason: '   ' }, LAWYER_USER)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(prisma.documentRequest.updateMany).not.toHaveBeenCalled();
    });

    it('a PENDING request (no files yet) cannot be approved → 400', async () => {
      prisma.documentRequest.findUnique.mockResolvedValue(requestRow('PENDING'));
      await expect(service.review('req-1', { decision: 'APPROVED' }, LAWYER_USER)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('another lawyer cannot review it → 403', async () => {
      prisma.documentRequest.findUnique.mockResolvedValue(requestRow('SUBMITTED', 1));
      await expect(service.review('req-1', { decision: 'APPROVED' }, OTHER_LAWYER)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('APPROVED records the reviewer and emits a reviewed event', async () => {
      prisma.documentRequest.findUnique.mockResolvedValue(requestRow('SUBMITTED', 1));
      await service.review('req-1', { decision: 'APPROVED' }, LAWYER_USER);
      expect(prisma.documentRequest.updateMany).toHaveBeenCalledWith({
        where: { id: 'req-1', status: 'SUBMITTED' },
        data: { status: 'APPROVED', reviewedById: LAWYER_USER.id, reviewedAt: expect.any(Date), rejectionReason: null },
      });
      expect(events.emitAsync).toHaveBeenCalledWith(
        DOCUMENT_REQUEST_EVENTS.reviewed,
        expect.objectContaining({ decision: 'APPROVED', rejectionReason: null }),
      );
    });

    it('REJECTED stores the trimmed reason', async () => {
      prisma.documentRequest.findUnique.mockResolvedValue(requestRow('UNDER_REVIEW', 1));
      await service.review('req-1', { decision: 'REJECTED', rejectionReason: ' Зураг бүдэг байна ' }, ADMIN_USER);
      expect(prisma.documentRequest.updateMany.mock.calls[0][0].data).toMatchObject({ status: 'REJECTED', rejectionReason: 'Зураг бүдэг байна' });
    });

    it('marking a submission UNDER_REVIEW does not notify anyone', async () => {
      prisma.documentRequest.findUnique.mockResolvedValue(requestRow('SUBMITTED', 1));
      await service.review('req-1', { decision: 'UNDER_REVIEW' }, LAWYER_USER);
      expect(prisma.documentRequest.updateMany.mock.calls[0][0].data).toMatchObject({ status: 'UNDER_REVIEW', reviewedAt: null });
      expect(events.emitAsync).not.toHaveBeenCalled();
    });
  });

  describe('update / delete / read', () => {
    it('DELETE of a request that already has files → 400', async () => {
      prisma.documentRequest.findUnique.mockResolvedValue(requestRow('SUBMITTED', 2));
      await expect(service.remove('req-1', LAWYER_USER)).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.documentRequest.delete).not.toHaveBeenCalled();
    });

    it('DELETE of a request without files removes it', async () => {
      prisma.documentRequest.findUnique.mockResolvedValue(requestRow('PENDING'));
      await service.remove('req-1', LAWYER_USER);
      expect(prisma.documentRequest.delete).toHaveBeenCalledWith({ where: { id: 'req-1' } });
    });

    it('editing a SUBMITTED request → 400', async () => {
      prisma.documentRequest.findUnique.mockResolvedValue(requestRow('SUBMITTED', 1));
      await expect(service.update('req-1', { title: 'Шинэ нэр' }, LAWYER_USER)).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.documentRequest.update).not.toHaveBeenCalled();
    });

    it('editing a REJECTED request only touches the given fields', async () => {
      prisma.documentRequest.findUnique.mockResolvedValue(requestRow('REJECTED', 1));
      await service.update('req-1', { dueDate: null, isRequired: false }, LAWYER_USER);
      expect(prisma.documentRequest.update.mock.calls[0][0].data).toEqual({ dueDate: null, isRequired: false });
    });

    it("CLIENT listing another client's case requests → 403", async () => {
      await expect(service.findByCase('case-1', {}, OTHER_CLIENT)).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.documentRequest.findMany).not.toHaveBeenCalled();
    });

    it('summary for a CLIENT counts PENDING + REJECTED requests inside their own cases', async () => {
      prisma.documentRequest.groupBy.mockResolvedValue([{ caseId: 'case-1', _count: { _all: 2 } }]);
      prisma.case.findMany.mockResolvedValue([{ id: 'case-1', caseNumber: 'LF-2026-0001', title: 'Түрээсийн маргаан' }]);

      const summary = await service.summary(CLIENT_USER);

      expect(prisma.documentRequest.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: { in: ['PENDING', 'REJECTED'] }, case: { clientId: CLIENT_USER.id } } }),
      );
      expect(summary).toEqual({
        total: 2,
        statuses: ['PENDING', 'REJECTED'],
        cases: [{ caseId: 'case-1', caseNumber: 'LF-2026-0001', title: 'Түрээсийн маргаан', count: 2 }],
      });
    });
  });
});