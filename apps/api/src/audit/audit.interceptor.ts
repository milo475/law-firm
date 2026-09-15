import { CallHandler, ExecutionContext, HttpException, Injectable, NestInterceptor } from '@nestjs/common';
import type { Response } from 'express';
import { Observable, tap } from 'rxjs';
import type { RequestWithUser } from '../common/types/request-user';
import { AuditService } from './audit.service';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const NESTED_RESOURCES = new Set(['documents', 'document-requests', 'events', 'invoices', 'members', 'messages']);

/** Global interceptor: writes an AuditLog row for every mutating HTTP request. */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly audit: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();

    const request = context.switchToHttp().getRequest<RequestWithUser & { route?: { path?: string } }>();
    if (!MUTATING_METHODS.has(request.method)) return next.handle();

    const response = context.switchToHttp().getResponse<Response>();
    const routePath = request.route?.path ?? request.path;
    const action = `${request.method} ${routePath}`;
    const entity = AuditInterceptor.entityFromRoute(routePath);

    return next.handle().pipe(
      tap({
        next: (body) => {
          this.audit.record({
            userId: request.user?.id ?? AuditInterceptor.idFromBody(body, 'user'),
            action,
            entity,
            entityId: AuditInterceptor.idFromBody(body) ?? (request.params?.id as string | undefined) ?? null,
            metadata: {
              statusCode: response.statusCode,
              params: request.params,
              query: request.query,
              userAgent: request.get('user-agent') ?? null,
            },
            ip: request.ip ?? null,
          });
        },
        error: (error: unknown) => {
          this.audit.record({
            userId: request.user?.id ?? null,
            action,
            entity,
            entityId: (request.params?.id as string | undefined) ?? null,
            metadata: {
              statusCode: error instanceof HttpException ? error.getStatus() : 500,
              params: request.params,
              query: request.query,
              failed: true,
            },
            ip: request.ip ?? null,
          });
        },
      }),
    );
  }

  /**
   * `/cases/:id/documents` → `documents`, `/auth/login` → `auth`,
   * `/notifications/:id/read` → `notifications`, `/posts/:id` → `posts`.
   */
  static entityFromRoute(routePath: string): string {
    const segments = routePath.split('/').filter(Boolean);
    if (segments.length === 0) return 'unknown';
    // Nested sub-resources live under a parent id: /parent/:id/child
    if (segments.length >= 3 && segments[1].startsWith(':') && NESTED_RESOURCES.has(segments[2])) {
      return segments[2];
    }
    return segments[0];
  }

  static idFromBody(body: unknown, nested?: string): string | null {
    if (!body || typeof body !== 'object') return null;
    const obj = body as Record<string, unknown>;
    const source = nested ? (obj[nested] as Record<string, unknown> | undefined) : obj;
    const id = source?.id;
    return typeof id === 'string' ? id : null;
  }
}
