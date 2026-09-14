import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import type { AccessTokenPayload } from '@law-firm/shared';
import type { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { RequestUser } from '../../common/types/request-user';
import type { Env } from '../../config/env';
import { PrismaService } from '../../prisma/prisma.service';
import { ACCESS_COOKIE } from '../auth.constants';

const cookieExtractor = (req: Request): string | null => {
  const cookies = (req as Request & { cookies?: Record<string, string> }).cookies;
  return cookies?.[ACCESS_COOKIE] ?? null;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService<Env, true>,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([ExtractJwt.fromAuthHeaderAsBearerToken(), cookieExtractor]),
      ignoreExpiration: false,
      secretOrKey: config.get('JWT_ACCESS_SECRET', { infer: true }),
    });
  }

  /** Re-validates the principal on every request so deactivated users lose access immediately. */
  async validate(payload: AccessTokenPayload): Promise<RequestUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, isActive: true },
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Хэрэглэгчийн эрх идэвхгүй байна');
    }
    return { id: user.id, email: user.email, role: user.role };
  }
}
