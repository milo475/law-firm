import { Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '@law-firm/shared';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditEntry {
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
  ip?: string | null;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Fire-and-forget: an audit failure must never break the original request. */
  record(entry: AuditEntry): void {
    void this.prisma.auditLog
      .create({
        data: {
          userId: entry.userId ?? null,
          action: entry.action,
          entity: entry.entity,
          entityId: entry.entityId ?? null,
          metadata: (entry.metadata as Prisma.InputJsonValue | undefined) ?? undefined,
          ip: entry.ip ?? null,
        },
      })
      .catch((error: unknown) => {
        this.logger.error(`Failed to write audit log: ${(error as Error).message}`);
      });
  }
}
