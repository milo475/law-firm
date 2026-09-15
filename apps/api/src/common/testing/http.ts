import { CanActivate, ExecutionContext, Injectable, type INestApplication, type ModuleMetadata } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { ZodValidationPipe } from 'nestjs-zod';
import { AllExceptionsFilter } from '../filters/http-exception.filter';
import { RolesGuard } from '../guards/roles.guard';
import type { RequestWithUser } from '../types/request-user';

export const TEST_ROLE_HEADER = 'x-test-role';

/** Stands in for JwtAuthGuard: the role comes from a header so RolesGuard can be exercised over HTTP. */
@Injectable()
class HeaderAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const role = request.header(TEST_ROLE_HEADER);
    if (role === 'ADMIN' || role === 'LAWYER' || role === 'CLIENT') {
      request.user = { id: `${role.toLowerCase()}-id`, email: `${role.toLowerCase()}@test.mn`, role };
    }
    return true;
  }
}

/** Boots controllers with the real RolesGuard, validation pipe and exception filter. */
export async function createGuardedApp(metadata: Pick<ModuleMetadata, 'controllers' | 'providers'>): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    controllers: metadata.controllers,
    providers: [
      ...(metadata.providers ?? []),
      { provide: APP_GUARD, useClass: HeaderAuthGuard },
      { provide: APP_GUARD, useClass: RolesGuard },
    ],
  }).compile();
  const app = moduleRef.createNestApplication();
  app.useGlobalPipes(new ZodValidationPipe());
  app.useGlobalFilters(new AllExceptionsFilter());
  await app.init();
  return app;
}
