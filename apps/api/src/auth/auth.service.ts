import { createHmac, randomBytes, randomUUID } from 'node:crypto';
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  Role,
  type AccessTokenPayload,
  type LoginInput,
  type RegisterInput,
  type SafeUser,
  type User,
} from '@law-firm/shared';
import argon2 from 'argon2';
import { toSafeUser } from '../common/utils/safe-user';
import type { Env } from '../config/env';
import { PrismaService } from '../prisma/prisma.service';

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
}

export interface AuthResult extends AuthTokens {
  user: SafeUser;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  // ─── Password helpers ──────────────────────────────────────────────────────

  hashPassword(password: string): Promise<string> {
    return argon2.hash(password, { type: argon2.argon2id });
  }

  verifyPassword(hash: string, password: string): Promise<boolean> {
    return argon2.verify(hash, password).catch(() => false);
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  async login(input: LoginInput): Promise<AuthResult> {
    const identifier = input.identifier.trim();
    const user = identifier.includes('@')
      ? await this.prisma.user.findUnique({ where: { email: identifier.toLowerCase() } })
      : await this.prisma.user.findUnique({ where: { phone: identifier.replace(/^\+976/, '') } });

    // Same error for unknown user and wrong password — never leak which one failed.
    if (!user || !(await this.verifyPassword(user.passwordHash, input.password))) {
      throw new UnauthorizedException('И-мэйл/утас эсвэл нууц үг буруу байна');
    }
    if (!user.isActive) {
      throw new ForbiddenException('Таны хаяг идэвхгүй болсон байна. Админтай холбогдоно уу');
    }

    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    const tokens = await this.issueTokens(user);
    return { user: toSafeUser(user), ...tokens };
  }

  /** Self-registration always creates a CLIENT and signs them in. */
  async register(input: RegisterInput): Promise<AuthResult> {
    const [emailTaken, phoneTaken] = await Promise.all([
      this.prisma.user.findUnique({ where: { email: input.email }, select: { id: true } }),
      input.phone
        ? this.prisma.user.findUnique({ where: { phone: input.phone }, select: { id: true } })
        : Promise.resolve(null),
    ]);
    if (emailTaken) throw new ConflictException('Энэ и-мэйл хаяг аль хэдийн бүртгэлтэй байна');
    if (phoneTaken) throw new ConflictException('Энэ утасны дугаар аль хэдийн бүртгэлтэй байна');

    const user = await this.prisma.user.create({
      data: {
        email: input.email,
        phone: input.phone ?? null,
        passwordHash: await this.hashPassword(input.password),
        firstName: input.firstName,
        lastName: input.lastName,
        role: Role.CLIENT,
        lastLoginAt: new Date(),
      },
    });
    const tokens = await this.issueTokens(user);
    return { user: toSafeUser(user), ...tokens };
  }

  /**
   * Rotates a refresh token: the presented token is revoked (rotatedAt set) and a fresh pair is issued in the same session family.
   * Presenting an already-revoked token is treated as theft → every session of that user is revoked. The one exception is a
   * token rotated less than REFRESH_REUSE_GRACE_SECONDS ago whose session still has a live token: that is another tab or a
   * retried request racing the first refresh, so it gets its own pair instead of logging the user out everywhere.
   */
  async refresh(rawToken: string | undefined): Promise<AuthResult> {
    if (!rawToken) throw new UnauthorizedException('Сесс олдсонгүй. Дахин нэвтэрнэ үү');

    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: this.hashToken(rawToken) },
      include: { user: true },
    });
    if (!stored) throw new UnauthorizedException('Сесс хүчингүй байна. Дахин нэвтэрнэ үү');

    if (stored.revokedAt && !(await this.isConcurrentRefresh(stored))) {
      this.logger.warn(`Refresh token reuse detected for user ${stored.userId}; revoking all sessions`);
      await this.revokeAllForUser(stored.userId);
      throw new UnauthorizedException('Сесс хүчингүй болсон. Аюулгүй байдлын үүднээс дахин нэвтэрнэ үү');
    }
    if (stored.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('Сессийн хугацаа дууссан. Дахин нэвтэрнэ үү');
    }
    if (!stored.user.isActive) {
      throw new ForbiddenException('Таны хаяг идэвхгүй болсон байна');
    }

    if (stored.revokedAt) {
      this.logger.debug(`Concurrent refresh for user ${stored.userId} within the grace window`);
    } else {
      const now = new Date();
      await this.prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: now, rotatedAt: now } });
    }
    const tokens = await this.issueTokens(stored.user, stored.familyId);
    return { user: toSafeUser(stored.user), ...tokens };
  }

  async logout(rawToken: string | undefined): Promise<void> {
    if (!rawToken) return;
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: this.hashToken(rawToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async me(userId: string): Promise<SafeUser> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('Хэрэглэгч олдсонгүй');
    return toSafeUser(user);
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  // ─── Token internals ───────────────────────────────────────────────────────

  /** Rotated moments ago by another request, while its login session still has a live token (not logged out, no revoke-all). */
  private async isConcurrentRefresh(stored: { familyId: string; rotatedAt: Date | null }): Promise<boolean> {
    const graceMs = this.config.get('REFRESH_REUSE_GRACE_SECONDS', { infer: true }) * 1000;
    if (!stored.rotatedAt || graceMs === 0 || Date.now() - stored.rotatedAt.getTime() > graceMs) return false;
    const live = await this.prisma.refreshToken.count({
      where: { familyId: stored.familyId, revokedAt: null, expiresAt: { gt: new Date() } },
    });
    return live > 0;
  }

  /** A login starts a new session family; a refresh passes the family of the token it replaces. */
  private async issueTokens(user: User, familyId: string = randomUUID()): Promise<AuthTokens> {
    const payload: AccessTokenPayload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = await this.jwt.signAsync(payload);

    const refreshToken = randomBytes(48).toString('base64url');
    const refreshExpiresAt = new Date(
      Date.now() + this.config.get('JWT_REFRESH_TTL_DAYS', { infer: true }) * 86_400_000,
    );
    await this.prisma.refreshToken.create({
      data: { userId: user.id, familyId, tokenHash: this.hashToken(refreshToken), expiresAt: refreshExpiresAt },
    });

    return { accessToken, refreshToken, refreshExpiresAt };
  }

  /** Refresh tokens are stored as keyed SHA-256 hashes; the raw value only lives in the cookie. */
  private hashToken(token: string): string {
    return createHmac('sha256', this.config.get('JWT_REFRESH_SECRET', { infer: true }))
      .update(token)
      .digest('hex');
  }
}
