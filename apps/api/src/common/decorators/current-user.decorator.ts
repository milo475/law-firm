import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { RequestUser, RequestWithUser } from '../types/request-user';

/**
 * Injects the authenticated user (or one of its fields) into a handler parameter.
 *   @CurrentUser() user: RequestUser
 *   @CurrentUser('id') userId: string
 */
export const CurrentUser = createParamDecorator(
  (field: keyof RequestUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;
    if (!user) return undefined;
    return field ? user[field] : user;
  },
);
