import type { Role } from '@law-firm/shared';
import type { Request } from 'express';

/** The authenticated principal attached to `req.user` by JwtStrategy. */
export interface RequestUser {
  id: string;
  email: string;
  role: Role;
}

export interface RequestWithUser extends Request {
  user?: RequestUser;
}
