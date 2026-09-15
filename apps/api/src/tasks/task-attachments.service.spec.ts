import { BadRequestException, ForbiddenException, NotFoundException, PayloadTooLargeException, UnsupportedMediaTypeException } from '@nestjs/common';
import type { EventEmitter2 } from '@nestjs/event-emitter';
import { CasesService } from '../cases/cases.service';
import { ADMIN_USER, CLIENT_USER, LAWYER_USER, OTHER_LAWYER, createPrismaMock, type PrismaMock } from '../common/testing/mocks';
import type { RequestUser } from '../common/types/request-user';
import type { PrismaService } from '../prisma/prisma.service';
import type { StorageService } from '../storage/storage.service';
import { TaskAttachmentsService } from './task-attachments.service';
import { TasksService } from './tasks.service';

const MEMBER: RequestUser = { id: 'member-lawyer-id', email: 'member@lawfirm.mn', role: 'LAWYER' };
const taskRow = {
  id: 'task-1',
  title: 'Нэхэмжлэлийн төсөл',
  status: 'TODO',
  assigneeId: MEMBER.id,
  createdById: LAWYER_USER.id,
  caseId: 'case-1',
  case: { caseNumber: 'LF-2026-0001', clientId: CLIENT_USER.id, lawyerId: LAWYER_USER.id, members: [{ userId: LAWYER_USER.id, role: 'LEAD' }, { userId: MEMBER.id, role: 'MEMBER' }] },
};
const attachmentRow = { id: 'att-1', taskId: 'task-1', name: 'Гэрээ.pdf', mimeType: 'application/pdf', size: 1024, storageKey: 'tasks/task-1/abc.pdf', uploadedById: MEMBER.id };
// multer hands over UTF-8 names decoded as latin1
const file = (overrides: Record<string, unknown> = {}) => ({
  originalname: Buffer.from('Гэрээний төсөл.PDF', 'utf8').toString('latin1'),
  mimetype: 'application/pdf',
  size: 2048,
  buffer: Buffer.from('%PDF-1.4'),
  ...overrides,
});

describe('TaskAttachmentsService', () => {
  let prisma: PrismaMock;
  let storage: { upload: jest.Mock; presignedGetUrl: jest.Mock; delete: jest.Mock };
  let service: TaskAttachmentsService;

  beforeEach(() => {
    prisma = createPrismaMock();
    storage = { upload: jest.fn().mockResolvedValue(undefined), presignedGetUrl: jest.fn().mockResolvedValue('https://files.test/signed'), delete: jest.fn().mockResolvedValue(undefined) };
    const tasks = new TasksService(prisma as unknown as PrismaService, new CasesService(prisma as unknown as PrismaService), { emitAsync: jest.fn() } as unknown as EventEmitter2);
    service = new TaskAttachmentsService(prisma as unknown as PrismaService, tasks, storage as unknown as StorageService);
    prisma.task.findUnique.mockResolvedValue(taskRow);
    prisma.taskAttachment.findUnique.mockResolvedValue(attachmentRow);
    prisma.taskAttachment.create.mockImplementation(async ({ data }: any) => ({ id: 'att-new', ...data }));
  });

  it('someone who can open the task uploads a file to tasks/<taskId>/ with its UTF-8 name', async () => {
    await service.upload('task-1', file(), {}, MEMBER);
    const key = storage.upload.mock.calls[0][0].key as string;
    expect(key).toMatch(/^tasks\/task-1\/[0-9a-f-]{36}\.pdf$/);
    expect(prisma.taskAttachment.create.mock.calls[0][0].data).toEqual({
      taskId: 'task-1',
      name: 'Гэрээний төсөл.PDF',
      mimeType: 'application/pdf',
      size: 2048,
      storageKey: key,
      uploadedById: MEMBER.id,
    });
  });

  it('a lawyer outside the task scope cannot upload, list or download → 403, and nothing reaches storage', async () => {
    await expect(service.upload('task-1', file(), {}, OTHER_LAWYER)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.list('task-1', OTHER_LAWYER)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.downloadUrl('att-1', OTHER_LAWYER)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.list('task-1', CLIENT_USER)).rejects.toBeInstanceOf(ForbiddenException);
    expect(storage.upload).not.toHaveBeenCalled();
    expect(storage.presignedGetUrl).not.toHaveBeenCalled();
  });

  it('rejects a missing file (400), a file over 20MB (413) and an unsupported type (415)', async () => {
    await expect(service.upload('task-1', undefined, {}, MEMBER)).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.upload('task-1', file({ size: 21 * 1024 * 1024 }), {}, MEMBER)).rejects.toBeInstanceOf(PayloadTooLargeException);
    await expect(service.upload('task-1', file({ mimetype: 'application/zip' }), {}, MEMBER)).rejects.toBeInstanceOf(UnsupportedMediaTypeException);
    expect(storage.upload).not.toHaveBeenCalled();
  });

  it('removes the stored object again when the database write fails', async () => {
    prisma.taskAttachment.create.mockRejectedValue(new Error('db down'));
    await expect(service.upload('task-1', file(), { name: 'Хавсралт' }, MEMBER)).rejects.toThrow('db down');
    expect(storage.delete).toHaveBeenCalledWith(storage.upload.mock.calls[0][0].key);
  });

  it('download returns a 5-minute presigned URL for a team member; an unknown attachment → 404', async () => {
    await expect(service.downloadUrl('att-1', LAWYER_USER)).resolves.toEqual({ url: 'https://files.test/signed', expiresInSeconds: 300, name: 'Гэрээ.pdf', mimeType: 'application/pdf', size: 1024 });
    expect(storage.presignedGetUrl).toHaveBeenCalledWith('tasks/task-1/abc.pdf', 'Гэрээ.pdf', 300);
    prisma.taskAttachment.findUnique.mockResolvedValue(null);
    await expect(service.downloadUrl('missing', ADMIN_USER)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('the uploader deletes their file (object and row); another team member cannot → 403', async () => {
    await expect(service.remove('att-1', LAWYER_USER)).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.taskAttachment.delete).not.toHaveBeenCalled();
    await service.remove('att-1', MEMBER);
    expect(storage.delete).toHaveBeenCalledWith('tasks/task-1/abc.pdf');
    expect(prisma.taskAttachment.delete).toHaveBeenCalledWith({ where: { id: 'att-1' } });
  });

  it('ADMIN may delete any attachment, even when the stored object is already gone', async () => {
    storage.delete.mockRejectedValue(new Error('NoSuchKey'));
    await service.remove('att-1', ADMIN_USER);
    expect(prisma.taskAttachment.delete).toHaveBeenCalledWith({ where: { id: 'att-1' } });
  });

  it('lists the files newest first for anyone who can open the task', async () => {
    prisma.taskAttachment.findMany.mockResolvedValue([{ id: 'att-1' }]);
    await expect(service.list('task-1', LAWYER_USER)).resolves.toEqual([{ id: 'att-1' }]);
    expect(prisma.taskAttachment.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { taskId: 'task-1' }, orderBy: { createdAt: 'desc' } }));
  });

  it('deleting a task also removes its attachment objects from storage', async () => {
    const tasksWithStorage = new TasksService(
      prisma as unknown as PrismaService,
      new CasesService(prisma as unknown as PrismaService),
      { emitAsync: jest.fn() } as unknown as EventEmitter2,
      storage as unknown as StorageService,
    );
    prisma.task.findUnique.mockResolvedValue({ ...taskRow, createdById: LAWYER_USER.id });
    prisma.taskAttachment.findMany.mockResolvedValue([{ storageKey: 'tasks/task-1/a.pdf' }, { storageKey: 'tasks/task-1/b.png' }]);
    await tasksWithStorage.remove('task-1', LAWYER_USER);
    expect(prisma.task.delete).toHaveBeenCalledWith({ where: { id: 'task-1' } });
    expect(storage.delete.mock.calls.map(([key]) => key)).toEqual(['tasks/task-1/a.pdf', 'tasks/task-1/b.png']);
  });
});
