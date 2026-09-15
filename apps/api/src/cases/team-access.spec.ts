import { ForbiddenException } from '@nestjs/common';
import type { EventEmitter2 } from '@nestjs/event-emitter';
import { ADMIN_USER, CLIENT_USER, LAWYER_USER, OTHER_LAWYER, createPrismaMock, type PrismaMock } from '../common/testing/mocks';
import type { RequestUser } from '../common/types/request-user';
import { DocumentsService } from '../documents/documents.service';
import { MessagesService } from '../messages/messages.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { CaseEventsService } from './case-events.service';
import { CasesService } from './cases.service';

const MEMBER_LAWYER: RequestUser = { id: 'member-lawyer-id', email: 'member@lawfirm.mn', role: 'LAWYER' };
const members = [
  { userId: LAWYER_USER.id, role: 'LEAD' },
  { userId: MEMBER_LAWYER.id, role: 'MEMBER' },
];
const teamCase = { id: 'case-1', caseNumber: 'LF-2026-0001', title: 'Маргаан', clientId: CLIENT_USER.id, lawyerId: LAWYER_USER.id, status: 'IN_PROGRESS', members };

describe('Case team access (member-based scope across modules)', () => {
  let prisma: PrismaMock;
  let cases: CasesService;

  beforeEach(() => {
    prisma = createPrismaMock();
    cases = new CasesService(prisma as unknown as PrismaService);
    prisma.case.findUnique.mockResolvedValue(teamCase);
    prisma.case.findMany.mockResolvedValue([]);
    prisma.case.count.mockResolvedValue(0);
  });

  it('a team MEMBER opens the case; a lawyer outside the team still gets 403', async () => {
    await expect(cases.findOne('case-1', MEMBER_LAWYER)).resolves.toMatchObject({ id: 'case-1' });
    await expect(cases.findOne('case-1', OTHER_LAWYER)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('clients still open their case, but without the internal staff team', async () => {
    const result = await cases.findOne('case-1', CLIENT_USER);
    expect(result.id).toBe('case-1');
    expect(result.members).toBeUndefined();
    expect((await cases.findOne('case-1', ADMIN_USER)).members).toHaveLength(2);
  });

  it('a MEMBER works on the case (adds an event) but core data and closing stay with the LEAD', async () => {
    const notifications = { createMany: jest.fn() };
    const events = new CaseEventsService(prisma as unknown as PrismaService, cases, notifications as unknown as NotificationsService);
    prisma.caseEvent.create.mockResolvedValue({ id: 'event-1' });

    await events.create('case-1', { type: 'NOTE', title: 'Тэмдэглэл', eventDate: new Date(), isVisibleToClient: false }, MEMBER_LAWYER);
    expect(prisma.caseEvent.create).toHaveBeenCalledTimes(1);

    await expect(cases.update('case-1', { title: 'Шинэ гарчиг' }, MEMBER_LAWYER)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(cases.close('case-1', {}, MEMBER_LAWYER)).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.case.update).not.toHaveBeenCalled();

    prisma.case.update.mockResolvedValue(teamCase);
    await cases.update('case-1', { title: 'Ахлах зассан' }, LAWYER_USER);
    expect(prisma.case.update).toHaveBeenCalledTimes(1);
  });

  it('a MEMBER downloads a document of the team case; an outsider cannot', async () => {
    const storage = { presignedGetUrl: jest.fn().mockResolvedValue('https://minio/signed'), upload: jest.fn(), delete: jest.fn() };
    const documents = new DocumentsService(prisma as unknown as PrismaService, cases, storage as unknown as StorageService);
    prisma.document.findUnique.mockResolvedValue({
      id: 'doc-1', name: 'geree.pdf', mimeType: 'application/pdf', size: 10, storageKey: 'k', isVisibleToClient: true,
      case: { clientId: CLIENT_USER.id, lawyerId: LAWYER_USER.id, members },
    });

    await expect(documents.downloadUrl('doc-1', MEMBER_LAWYER)).resolves.toMatchObject({ url: 'https://minio/signed' });
    await expect(documents.downloadUrl('doc-1', OTHER_LAWYER)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("a MEMBER writes in the case chat; the client's messages still go to the LEAD", async () => {
    const emitter = { emitAsync: jest.fn().mockResolvedValue([]) };
    const messages = new MessagesService(prisma as unknown as PrismaService, cases, emitter as unknown as EventEmitter2);
    prisma.message.create.mockImplementation(async ({ data }: any) => ({ id: 'msg', body: data.body, createdAt: new Date(), sender: { firstName: 'A', lastName: 'B' } }));

    await messages.send('case-1', { body: 'Баримтыг шалгалаа' }, MEMBER_LAWYER);
    expect(emitter.emitAsync.mock.calls[0][1]).toMatchObject({ recipientId: CLIENT_USER.id });

    await messages.send('case-1', { body: 'Баярлалаа' }, CLIENT_USER);
    expect(emitter.emitAsync.mock.calls[1][1]).toMatchObject({ recipientId: LAWYER_USER.id });
  });

  it('a new case starts its team with the assigned lawyer as LEAD', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: CLIENT_USER.id, role: 'CLIENT', isActive: true });
    prisma.case.create.mockImplementation(async ({ data }: any) => ({ id: 'new-case', ...data }));

    await cases.create({ title: 'Шинэ хэрэг', type: 'CIVIL', clientId: CLIENT_USER.id }, LAWYER_USER);

    expect(prisma.case.create.mock.calls[0][0].data.members).toEqual({
      create: { userId: LAWYER_USER.id, role: 'LEAD', addedById: LAWYER_USER.id },
    });
  });

  it('ADMIN reassigning the lawyer moves the LEAD membership (the previous lead leaves the team)', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: OTHER_LAWYER.id, role: 'LAWYER', isActive: true });
    prisma.case.update.mockResolvedValue(teamCase);

    await cases.update('case-1', { lawyerId: OTHER_LAWYER.id }, ADMIN_USER);

    expect(prisma.caseMember.deleteMany).toHaveBeenCalledWith({ where: { caseId: 'case-1', userId: LAWYER_USER.id } });
    expect(prisma.caseMember.upsert).toHaveBeenCalledWith({
      where: { caseId_userId: { caseId: 'case-1', userId: OTHER_LAWYER.id } },
      create: { caseId: 'case-1', userId: OTHER_LAWYER.id, role: 'LEAD', addedById: ADMIN_USER.id },
      update: { role: 'LEAD' },
    });
  });
});
