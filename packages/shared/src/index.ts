// ─── Prisma client ───────────────────────────────────────────────────────────
export { createPrismaAdapter, createPrismaClient, getPrismaClient, PrismaClientCtor } from './db.js';
export type { PrismaClient, CreatePrismaClientOptions } from './db.js';
export { Prisma } from './generated/prisma/client.js';
export type * as PrismaModels from './generated/prisma/models.js';

// ─── Enums (value + type) ────────────────────────────────────────────────────
export {
  Role,
  PostCategory,
  PostStatus,
  CaseType,
  CaseStatus,
  CaseEventType,
  InvoiceStatus,
  ContactStatus,
  ServiceRequestStatus,
  ServiceRequestType,
  DocumentRequestStatus,
  CaseMemberRole,
  TaskStatus,
  TaskPriority,
  TestimonialStatus,
  TestimonialSource,
} from './generated/prisma/enums.js';

// ─── Model types ─────────────────────────────────────────────────────────────
export type {
  User,
  RefreshToken,
  LawyerProfile,
  Post,
  Case,
  CaseEvent,
  Document,
  DocumentRequest,
  Message,
  CaseMember,
  Task,
  TaskComment,
  Invoice,
  Notification,
  ContactRequest,
  AuditLog,
  Testimonial,
} from './generated/prisma/client.js';

// ─── Zod schemas, labels, utils ──────────────────────────────────────────────
export * from './schemas/index.js';
export * from './labels.js';
export * from './utils/slug.js';
export * from './utils/case-number.js';
export * from './utils/test-data.js';
export * from './utils/sentry-scrub.js';

/** A User with secrets stripped — the shape returned by the API. */
export type SafeUser = {
  id: string;
  email: string;
  phone: string | null;
  firstName: string;
  lastName: string;
  role: 'ADMIN' | 'LAWYER' | 'CLIENT';
  avatarUrl: string | null;
  isActive: boolean;
  lastLoginAt: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};
