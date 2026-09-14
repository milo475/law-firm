import { SetMetadata } from '@nestjs/common';
import type { Role } from '@law-firm/shared';

export const ROLES_KEY = 'roles';

/** Restricts a route to the given roles (checked by RolesGuard after JWT auth). */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
