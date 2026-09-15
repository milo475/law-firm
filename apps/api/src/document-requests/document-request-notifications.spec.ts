import { EventEmitterModule } from '@nestjs/event-emitter';
import { Test, type TestingModule } from '@nestjs/testing';
import { CasesService } from '../cases/cases.service';
import { CLIENT_USER, LAWYER_USER, createPrismaMock, type PrismaMock } from '../common/testing/mocks';
import { DocumentsService } from '../documents/documents.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { DocumentRequestNotificationsListener } from './document-request-notifications.listener';
import { DocumentRequestsService } from './document-requests.service';

const caseRecord = { id: 'case-1', caseNumber: 'LF-2026-0001', clientId: CLIENT_USER.id, lawyerId: LAWYER_USER.id, status: 'IN_PROGRESS' };
const requestRow = (status: string) => ({
  id: 'req-1',
  caseId: 'case-1',
  title: 'Иргэний үнэмлэхний хуулбар',
  status,
  case: caseRecord,
  _count: { documents: status === 'PENDING' ? 0 : 1 },
});

describe('Document request events → notifications (EventEmitter2 wiring)', () => {
  let moduleRef: TestingModule;
  let service: DocumentRequestsService;
  let prisma: PrismaMock;
  let notifications: { createMany: jest.Mock };

  beforeEach(async () => {
    prisma = createPrismaMock();
    notifications = { createMany: jest.fn().mockResolvedValue({ count: 1 }) };
    moduleRef = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot()],
      providers: [
        DocumentRequestsService,
        DocumentRequestNotificationsListener,
        CasesService,
        DocumentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: StorageService, useValue: { upload: jest.fn(), delete: jest.fn() } },
        { provide: NotificationsService, useValue: notifications },
      ],
    }).compile();
    await moduleRef.init(); // registers @OnEvent handlers
    service = moduleRef.get(DocumentRequestsService);

    prisma.case.findUnique.mockResolvedValue(caseRecord);
    prisma.documentRequest.create.mockImplementation(async ({ data }: any) => ({ id: `req-${data.title}`, ...data }));
    prisma.documentRequest.updateMany.mockResolvedValue({ count: 1 });
    prisma.documentRequest.findUniqueOrThrow.mockResolvedValue({ id: 'req-1' });
    prisma.document.create.mockResolvedValue({ id: 'doc-1' });
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  const sent = () => notifications.createMany.mock.calls.map(([inputs]) => inputs[0]);

  it('document-request.created → the client is asked for the document', async () => {
    await service.create('case-1', { items: [{ title: 'Иргэний үнэмлэхний хуулбар', isRequired: true, dueDate: new Date('2026-10-01T03:00:00Z') }] }, LAWYER_USER);
    expect(sent()).toEqual([
      {
        userId: CLIENT_USER.id,
        type: 'DOCUMENT_REQUEST',
        title: 'Танаас баримт хүсэлээ: Иргэний үнэмлэхний хуулбар',
        body: 'LF-2026-0001 · эцсийн хугацаа 2026.10.01',
        link: '/portal/cases/case-1?tab=requests',
        actorId: LAWYER_USER.id,
      },
    ]);
  });

  it('several requests at once → one notification that lists them', async () => {
    await service.create('case-1', { items: [{ title: 'Үнэмлэх', isRequired: true }, { title: 'Хуулга', isRequired: true }] }, LAWYER_USER);
    expect(sent()).toEqual([expect.objectContaining({ title: 'Танаас 2 баримт хүсэлээ: Үнэмлэх, Хуулга', body: 'LF-2026-0001' })]);
  });

  it('document-request.submitted → the assigned lawyer hears that the document arrived', async () => {
    prisma.documentRequest.findUnique.mockResolvedValue(requestRow('PENDING'));
    const pdf = { originalname: 'a.pdf', mimetype: 'application/pdf', size: 10, buffer: Buffer.from('x') };
    await service.submit('req-1', [pdf], CLIENT_USER);
    expect(sent()).toEqual([
      {
        userId: LAWYER_USER.id,
        type: 'DOCUMENT_REQUEST',
        title: 'Баримт ирлээ: Иргэний үнэмлэхний хуулбар',
        body: 'LF-2026-0001 · 1 файл',
        link: '/admin/cases/case-1?tab=requests',
        actorId: CLIENT_USER.id,
      },
    ]);
  });

  it('document-request.reviewed (APPROVED) → the client hears it was accepted', async () => {
    prisma.documentRequest.findUnique.mockResolvedValue(requestRow('SUBMITTED'));
    await service.review('req-1', { decision: 'APPROVED' }, LAWYER_USER);
    expect(sent()).toEqual([expect.objectContaining({ userId: CLIENT_USER.id, title: 'Баримт хүлээн авлаа: Иргэний үнэмлэхний хуулбар' })]);
  });

  it('document-request.reviewed (REJECTED) → the client gets the reason', async () => {
    prisma.documentRequest.findUnique.mockResolvedValue(requestRow('SUBMITTED'));
    await service.review('req-1', { decision: 'REJECTED', rejectionReason: 'Зураг бүдэг байна' }, LAWYER_USER);
    expect(sent()).toEqual([
      expect.objectContaining({
        userId: CLIENT_USER.id,
        title: 'Дахин илгээнэ үү: Зураг бүдэг байна',
        body: 'Иргэний үнэмлэхний хуулбар · LF-2026-0001',
      }),
    ]);
  });

  it('a failing notification insert does not fail the review itself', async () => {
    prisma.documentRequest.findUnique.mockResolvedValue(requestRow('SUBMITTED'));
    notifications.createMany.mockRejectedValue(new Error('db down'));
    await expect(service.review('req-1', { decision: 'APPROVED' }, LAWYER_USER)).resolves.toEqual({ id: 'req-1' });
  });
});
