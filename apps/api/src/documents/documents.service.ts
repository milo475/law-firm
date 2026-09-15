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
  ALLOWED_DOCUMENT_MIME_TYPES,
  MAX_DOCUMENT_SIZE_BYTES,
  Role,
  type UploadDocumentInput,
} from '@law-firm/shared';
import { CasesService } from '../cases/cases.service';
import type { RequestUser } from '../common/types/request-user';
import { PUBLIC_USER_SELECT } from '../common/utils/safe-user';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

export interface UploadedFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export interface StoredFile {
  name: string;
  mimeType: string;
  size: number;
  storageKey: string;
}

export const DOCUMENT_SELECT = {
  id: true,
  caseId: true,
  requestId: true,
  name: true,
  mimeType: true,
  size: true,
  isVisibleToClient: true,
  createdAt: true,
  uploadedBy: { select: PUBLIC_USER_SELECT },
} as const;

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cases: CasesService,
    private readonly storage: StorageService,
  ) {}

  async findByCase(caseId: string, user: RequestUser) {
    await this.cases.assertAccessById(caseId, user);
    return this.prisma.document.findMany({
      where: { caseId, ...(user.role === Role.CLIENT ? { isVisibleToClient: true } : {}) },
      select: DOCUMENT_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  async upload(caseId: string, file: UploadedFile | undefined, input: UploadDocumentInput, user: RequestUser) {
    if (!file) throw new BadRequestException('Файл сонгоно уу (multipart талбар: "file")');
    this.assertValidFile(file);

    const record = await this.cases.assertAccessById(caseId, user);
    const stored = await this.storeFile(record.caseNumber, file, input.name);

    return this.prisma.document.create({
      data: {
        caseId,
        ...stored,
        uploadedById: user.id,
        // A client's own upload is always visible to them.
        isVisibleToClient: user.role === Role.CLIENT ? true : input.isVisibleToClient,
      },
      select: DOCUMENT_SELECT,
    });
  }

  /** Size + MIME type checks shared by direct uploads and document request submissions. */
  assertValidFile(file: UploadedFile): void {
    if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
      throw new PayloadTooLargeException('Файлын хэмжээ 20MB-аас хэтэрч болохгүй');
    }
    if (!(ALLOWED_DOCUMENT_MIME_TYPES as readonly string[]).includes(file.mimetype)) {
      throw new UnsupportedMediaTypeException('Зөвхөн PDF, Word, Excel, зураг, текст файл хавсаргах боломжтой');
    }
  }

  /** Uploads the file to MinIO under the case prefix and returns the columns for a Document row. */
  async storeFile(caseNumber: string, file: UploadedFile, displayName?: string): Promise<StoredFile> {
    // multer decodes multipart filenames as latin1
    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    const storageKey = `cases/${caseNumber}/${randomUUID()}${extname(originalName).toLowerCase()}`;
    await this.storage.upload({ key: storageKey, body: file.buffer, mimeType: file.mimetype, size: file.size });
    return { name: displayName?.trim() || originalName, mimeType: file.mimetype, size: file.size, storageKey };
  }

  /** Best-effort cleanup of objects whose database write failed. */
  async discardStored(storageKeys: string[]): Promise<void> {
    for (const key of storageKeys) {
      try {
        await this.storage.delete(key);
      } catch (error) {
        this.logger.warn(`Could not remove orphaned object ${key}: ${(error as Error).message}`);
      }
    }
  }

  /** Returns a short-lived presigned URL after checking case scope + client visibility. */
  async downloadUrl(documentId: string, user: RequestUser, inline = false) {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
      include: { case: { select: { clientId: true, lawyerId: true } } },
    });
    if (!document) throw new NotFoundException('Баримт олдсонгүй');
    this.cases.assertAccess(document.case, user);
    if (user.role === Role.CLIENT && !document.isVisibleToClient) {
      throw new ForbiddenException('Энэ баримтыг үзэх эрх танд байхгүй байна');
    }

    const expiresInSeconds = 300;
    // inline=true → no attachment disposition, so PDFs/images can be previewed in the browser
    const url = await this.storage.presignedGetUrl(document.storageKey, inline ? undefined : document.name, expiresInSeconds);
    return { url, expiresInSeconds, name: document.name, mimeType: document.mimeType, size: document.size };
  }

  /**
   * ADMIN, or the LAWYER who uploaded the file while still assigned to the case.
   * The MinIO object is removed first; a missing object does not block deleting the record.
   */
  async remove(documentId: string, user: RequestUser): Promise<void> {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
      include: { case: { select: { clientId: true, lawyerId: true } } },
    });
    if (!document) throw new NotFoundException('Баримт олдсонгүй');

    if (user.role !== Role.ADMIN) {
      if (user.role !== Role.LAWYER || document.uploadedById !== user.id) {
        throw new ForbiddenException('Зөвхөн өөрийн оруулсан баримтыг устгах боломжтой');
      }
      this.cases.assertStaffAccess(document.case, user);
    }

    try {
      await this.storage.delete(document.storageKey);
    } catch (error) {
      this.logger.warn(`Could not remove object ${document.storageKey}: ${(error as Error).message}`);
    }
    await this.prisma.document.delete({ where: { id: documentId } });
  }
}
