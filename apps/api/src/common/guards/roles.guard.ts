import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Role } from '@law-firm/shared';
import { ROLES_KEY } from '../decorators/roles.decorator';
import type { RequestWithUser } from '../types/request-user';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const { user } = context.switchToHttp().getRequest<RequestWithUser>();
    if (!user) {
      throw new ForbiddenException('Энэ үйлдлийг хийх эрх танд байхгүй байна');
    }
    if (!required.includes(user.role)) {
      throw new ForbiddenException('Энэ үйлдлийг хийх эрх танд байхгүй байна');
    }
    return true;
  }
}
