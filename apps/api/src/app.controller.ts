import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { databaseNameFromUrl } from '@law-firm/shared';
import { Public } from './common/decorators';
import type { Env } from './config/env';
import { PrismaService } from './prisma/prisma.service';

@ApiTags('health')
@Controller()
export class AppController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Health check (DB ping); outside production it also names the database' })
  async health() {
    let database: 'up' | 'down' = 'up';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      database = 'down';
    }
    return {
      status: database === 'up' ? 'ok' : 'degraded',
      database,
      // Which database this API serves. The screenshot run reads it to make sure the pages it
      // photographs come from lawfirm_test and not from the dev database; production keeps the
      // name to itself, where /health is public and nothing needs to know.
      databaseName: this.databaseName(),
      timestamp: new Date().toISOString(),
    };
  }

  private databaseName(): string | undefined {
    if (this.config.get('NODE_ENV', { infer: true }) === 'production') return undefined;
    return databaseNameFromUrl(this.config.get('DATABASE_URL', { infer: true })) ?? undefined;
  }
}
