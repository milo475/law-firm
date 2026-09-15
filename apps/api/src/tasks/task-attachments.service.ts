import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import {
  MAX_TASK_ATTACHMENT_SIZE_BYTES,
  Role,
  TASK_ATTACHMENT_LABELS,
  TASK_ATTACHMENT_MIME_TYPES,
  type Prisma,
  type UploadTaskAttachmentInput,
} from '@law-firm/shared';
import type { RequestUser } from '../common/types/request-user';
import { PUBLIC_USER_SELECT } from '../common/utils/safe-user';
import type { UploadedFile } from '../documents/documents.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { TasksService } from './tasks.service';

export const TASK_ATTACHMENT_SELECT = {
  id: true,
  taskId: true,
  name: true,
  mimeType: true,
  size: true,
  createdAt: true,
  uploadedBy: { select: PUBLIC_USER_SELECT },
} satisfies Prisma.TaskAttachmentSelect;

/**
 * Files on a task. Anyone who may open the task lists, uploads and downloads its files (same scope as the task);
 * deleting is for the uploader or an ADMIN. Objects live in MinIO under tasks/<taskId>/.
 */
@Injectable()
export class TaskAttachmentsService {
  private readonly logger = new Logger(TaskAttachmentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tasks: TasksService,
    private readonly storage: StorageService,
  ) {}

  async list(taskId: string, user: RequestUser) {
    await this.tasks.assertVisibleById(taskId, user);
    return this.prisma.taskAttachment.findMany({ where: { taskId }, select: TASK_ATTACHMENT_SELECT, orderBy: { createdAt: 'desc' } });
  }

  async upload(taskId: string, file: UploadedFile | undefined, input: UploadTaskAttachmentInput, user: RequestUser) {
    if (!file) throw new BadRequestException(TASK_ATTACHMENT_LABELS.missingFile);
    if (file.size > MAX_TASK_ATTACHMENT_SIZE_BYTES) throw new PayloadTooLargeException(TASK_ATTACHMENT_LABELS.tooLarge);
    if (!(TASK_ATTACHMENT_MIME_TYPES as readonly string[]).includes(file.mimetype)) {
      throw new UnsupportedMediaTypeException(TASK_ATTACHMENT_LABELS.unsupported);
    }
    await this.tasks.assertVisibleById(taskId, user);

    // multer decodes multipart filenames as latin1
    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    const storageKey = `tasks/${taskId}/${randomUUID()}${extname(originalName).toLowerCase()}`;
    await this.storage.upload({ key: storageKey, body: file.buffer, mimeType: file.mimetype, size: file.size });
    try {
      return await this.prisma.taskAttachment.create({
        data: { taskId, name: input.name?.trim() || originalName, mimeType: file.mimetype, size: file.size, storageKey, uploadedById: user.id },
        select: TASK_ATTACHMENT_SELECT,
      });
    } catch (error) {
      await this.discard(storageKey);
      throw error;
    }
  }

  /** Short-lived presigned URL (5 minutes) after the task scope check. */
  async downloadUrl(id: string, user: RequestUser) {
    const attachment = await this.load(id);
    await this.tasks.assertVisibleById(attachment.taskId, user);
    const expiresInSeconds = 300;
    const url = await this.storage.presignedGetUrl(attachment.storageKey, attachment.name, expiresInSeconds);
    return { url, expiresInSeconds, name: attachment.name, mimeType: attachment.mimeType, size: attachment.size };
  }

  /** The uploader or an ADMIN. A missing MinIO object does not block removing the record. */
  async remove(id: string, user: RequestUser): Promise<void> {
    const attachment = await this.load(id);
    await this.tasks.assertVisibleById(attachment.taskId, user);
    if (user.role !== Role.ADMIN && attachment.uploadedById !== user.id) {
      throw new ForbiddenException(TASK_ATTACHMENT_LABELS.deleteForbidden);
    }
    await this.discard(attachment.storageKey);
    await this.prisma.taskAttachment.delete({ where: { id } });
  }

  private async load(id: string) {
    const attachment = await this.prisma.taskAttachment.findUnique({
      where: { id },
      select: { id: true, taskId: true, name: true, mimeType: true, size: true, storageKey: true, uploadedById: true },
    });
    if (!attachment) throw new NotFoundException(TASK_ATTACHMENT_LABELS.notFound);
    return attachment;
  }

  private async discard(storageKey: string): Promise<void> {
    try {
      await this.storage.delete(storageKey);
    } catch (error) {
      this.logger.warn(`Could not remove object ${storageKey}: ${(error as Error).message}`);
    }
  }
}
