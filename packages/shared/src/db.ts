import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/prisma/client.js';

export type { PrismaClient } from './generated/prisma/client.js';
export { PrismaClient as PrismaClientCtor } from './generated/prisma/client.js';

export interface CreatePrismaClientOptions {
  connectionString?: string;
  log?: ('query' | 'info' | 'warn' | 'error')[];
}

/** Builds the PostgreSQL driver adapter required by Prisma 7. */
export function createPrismaAdapter(connectionString: string): PrismaPg {
  return new PrismaPg({ connectionString });
}

/** Creates a brand-new PrismaClient bound to the given connection string. */
export function createPrismaClient(options: CreatePrismaClientOptions = {}): PrismaClient {
  const connectionString = options.connectionString ?? process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }
  return new PrismaClient({
    adapter: createPrismaAdapter(connectionString),
    log: options.log ?? (process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error']),
  });
}

const globalForPrisma = globalThis as unknown as { __lawFirmPrisma?: PrismaClient };

/**
 * Process-wide singleton (safe for Next.js hot reload and scripts).
 * NestJS builds its own instance through PrismaService, but reuses this factory.
 */
export function getPrismaClient(): PrismaClient {
  if (!globalForPrisma.__lawFirmPrisma) {
    globalForPrisma.__lawFirmPrisma = createPrismaClient();
  }
  return globalForPrisma.__lawFirmPrisma;
}
