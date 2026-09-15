import type { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env';
import type { RequestUser } from '../types/request-user';

export const TEST_ENV: Env = {
  NODE_ENV: 'test',
  PORT: 4000,
  THROTTLE_LIMIT: 120,
  DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
  JWT_ACCESS_SECRET: 'test-access-secret-0123456789abcdef',
  JWT_REFRESH_SECRET: 'test-refresh-secret-0123456789abcdef',
  JWT_ACCESS_TTL: '15m',
  JWT_REFRESH_TTL_DAYS: 7,
  CORS_ORIGIN: 'http://localhost:3000',
  COOKIE_DOMAIN: undefined,
  MINIO_ENDPOINT: 'localhost',
  MINIO_PORT: 9000,
  MINIO_USE_SSL: false,
  MINIO_ACCESS_KEY: 'minioadmin',
  MINIO_SECRET_KEY: 'minioadmin',
  MINIO_BUCKET: 'test-bucket',
  MINIO_PUBLIC_URL: undefined,
};

export function createConfigMock(overrides: Partial<Env> = {}): ConfigService<Env, true> {
  const env = { ...TEST_ENV, ...overrides };
  return {
    get: jest.fn((key: keyof Env) => env[key]),
    getOrThrow: jest.fn((key: keyof Env) => env[key]),
  } as unknown as ConfigService<Env, true>;
}

type MockedDelegate = Record<string, jest.Mock>;

/** Builds a PrismaService stand-in where every used delegate method is a jest.fn(). */
export function createPrismaMock() {
  const delegate = (...methods: string[]): MockedDelegate =>
    Object.fromEntries(methods.map((method) => [method, jest.fn()]));

  const mock = {
    user: delegate('findUnique', 'findFirst', 'findMany', 'create', 'update', 'count'),
    refreshToken: delegate('findUnique', 'create', 'update', 'updateMany'),
    post: delegate('findMany', 'findFirst', 'findUnique', 'count', 'create', 'update', 'delete'),
    case: delegate('findMany', 'findFirst', 'findUnique', 'count', 'create', 'update', 'groupBy'),
    task: delegate('findMany', 'findUnique', 'count', 'create', 'update', 'delete', 'groupBy'),
    taskComment: delegate('create', 'findMany'),
    caseMember: delegate('findMany', 'findUnique', 'findFirst', 'create', 'update', 'updateMany', 'upsert', 'delete', 'deleteMany', 'count'),
    caseEvent: delegate('findMany', 'findUnique', 'count', 'create', 'update', 'delete'),
    document: delegate('findMany', 'findUnique', 'create', 'delete'),
    message: delegate('findMany', 'count', 'create', 'updateMany', 'groupBy'),
    documentRequest: delegate('findMany', 'findUnique', 'findUniqueOrThrow', 'count', 'create', 'update', 'updateMany', 'delete', 'groupBy'),
    invoice: delegate('findMany', 'findFirst', 'findUnique', 'findUniqueOrThrow', 'count', 'create', 'update', 'updateMany', 'aggregate'),
    notification: delegate('findMany', 'findFirst', 'count', 'update', 'updateMany', 'createMany'),
    lawyerProfile: delegate('findUnique', 'findFirst', 'findMany', 'create', 'update'),
    contactRequest: delegate('findMany', 'findUnique', 'count', 'create', 'update'),
    auditLog: delegate('create'),
    $queryRaw: jest.fn(),
    /** Interactive transactions run the callback against the same mock. */
    $transaction: jest.fn(),
  };
  mock.$transaction.mockImplementation((arg: unknown) =>
    typeof arg === 'function' ? (arg as (tx: unknown) => unknown)(mock) : Promise.all(arg as unknown[]),
  );
  return mock;
}

export type PrismaMock = ReturnType<typeof createPrismaMock>;

export const ADMIN_USER: RequestUser = { id: 'admin-id', email: 'admin@lawfirm.mn', role: 'ADMIN' };
export const LAWYER_USER: RequestUser = { id: 'lawyer-id', email: 'lawyer@lawfirm.mn', role: 'LAWYER' };
export const CLIENT_USER: RequestUser = { id: 'client-id', email: 'client@example.mn', role: 'CLIENT' };
export const OTHER_CLIENT: RequestUser = { id: 'other-client-id', email: 'other@example.mn', role: 'CLIENT' };

export const OTHER_LAWYER: RequestUser = { id: 'other-lawyer-id', email: 'other.lawyer@lawfirm.mn', role: 'LAWYER' };
