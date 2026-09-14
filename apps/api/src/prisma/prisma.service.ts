import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createPrismaAdapter, PrismaClientCtor } from '@law-firm/shared';
import type { Env } from '../config/env';

/**
 * Thin NestJS wrapper around the shared Prisma client.
 * The client class and driver adapter come from @law-firm/shared, so every
 * consumer of the monorepo talks to the same generated client.
 */
@Injectable()
export class PrismaService extends PrismaClientCtor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor(config: ConfigService<Env, true>) {
    super({
      adapter: createPrismaAdapter(config.get('DATABASE_URL', { infer: true })),
      log: config.get('NODE_ENV', { infer: true }) === 'development' ? ['warn', 'error'] : ['error'],
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Connected to PostgreSQL');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
