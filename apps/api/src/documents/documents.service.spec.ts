import { ForbiddenException } from '@nestjs/common';
import { CasesService } from '../cases/cases.service';
import { ADMIN_USER, LAWYER_USER, OTHER_LAWYER, createPrismaMock, type PrismaMock } from '../common/testing/mocks';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { DocumentsService } from './documents.service';

describe('DocumentsService (staff)', () => {
  let service: DocumentsService;
  let prisma: PrismaMock;
  let storage: { upload: jest.Mock; delete: jest.Mock; presignedGetUrl: jest.Mock };

  const doc = (uploadedById: string, lawyerId = LAWYER_USER.id) => ({
    id: 'doc-1',
    storageKey: 'cases/LF-2026-0001/abc.pdf',
    uploadedById,
    case: { clientId: 'client-id', lawyerId },
  });

  beforeEach(() => {
    prisma = createPrismaMock();
    storage = { upload: jest.fn(), delete: jest.fn().mockResolvedValue(undefined), presignedGetUrl: jest.fn() };
    service = new DocumentsService(
      prisma as unknown as PrismaService,
      new CasesService(prisma as unknown as PrismaService),
      storage as unknown as StorageService,
    );
  });

  it('the uploading lawyer deletes the MinIO object and the record', async () => {
    prisma.document.findUnique.mockResolvedValue(doc(LAWYER_USER.id));
    await service.remove('doc-1', LAWYER_USER);
    expect(storage.delete).toHaveBeenCalledWith('cases/LF-2026-0001/abc.pdf');
    expect(prisma.document.delete).toHaveBeenCalledWith({ where: { id: 'doc-1' } });
  });

  it('another lawyer cannot delete it → 403, storage untouched', async () => {
    prisma.document.findUnique.mockResolvedValue(doc(LAWYER_USER.id));
    await expect(service.remove('doc-1', OTHER_LAWYER)).rejects.toBeInstanceOf(ForbiddenException);
    expect(storage.delete).not.toHaveBeenCalled();
    expect(prisma.document.delete).not.toHaveBeenCalled();
  });

  it('ADMIN deletes the record even when the object is already gone from MinIO', async () => {
    prisma.document.findUnique.mockResolvedValue(doc('client-id'));
    storage.delete.mockRejectedValue(new Error('NoSuchKey'));
    await service.remove('doc-1', ADMIN_USER);
    expect(prisma.document.delete).toHaveBeenCalled();
  });

  it('a LAWYER cannot upload to a case they do not handle → 403, nothing stored', async () => {
    prisma.case.findUnique.mockResolvedValue({ id: 'case-1', caseNumber: 'LF-2026-0001', title: 'x', clientId: 'client-id', lawyerId: LAWYER_USER.id, status: 'NEW' });
    const file = { originalname: 'a.pdf', mimetype: 'application/pdf', size: 10, buffer: Buffer.from('x') };
    await expect(service.upload('case-1', file, { isVisibleToClient: false }, OTHER_LAWYER)).rejects.toBeInstanceOf(ForbiddenException);
    expect(storage.upload).not.toHaveBeenCalled();
  });

  it('staff uploads keep the isVisibleToClient flag', async () => {
    prisma.case.findUnique.mockResolvedValue({ id: 'case-1', caseNumber: 'LF-2026-0001', title: 'x', clientId: 'client-id', lawyerId: LAWYER_USER.id, status: 'NEW' });
    prisma.document.create.mockImplementation(async ({ data }: any) => data);
    const file = { originalname: 'a.pdf', mimetype: 'application/pdf', size: 10, buffer: Buffer.from('x') };
    await service.upload('case-1', file, { isVisibleToClient: false }, LAWYER_USER);
    expect(prisma.document.create.mock.calls[0][0].data.isVisibleToClient).toBe(false);
  });
});
