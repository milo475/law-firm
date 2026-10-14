import { createHmac, randomBytes, randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  AuthTokenPurpose,
  MN_PHONE_REGEX,
  Role,
  type AccessTokenPayload,
  type ForgotPasswordInput,
  type LoginInput,
  type RegisterInput,
  type ResetPasswordInput,
  type SafeUser,
  type User,
  type UserLocale,
} from '@law-firm/shared';
import argon2 from 'argon2';
import { err } from '../common/errors/app-error';
import { toSafeUser } from '../common/utils/safe-user';
import type { Env } from '../config/env';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';

/** How long a reset link lives; long enough to find the e-mail, short enough to matter. */
const RESET_TTL_HOURS = 1;
/** An invitation has to survive a weekend and a holiday. */
const INVITE_TTL_DAYS = 7;

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
    private readonly mail: MailService,
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
      throw new UnauthorizedException(err('auth.invalidCredentials', 'И-мэйл/утас эсвэл нууц үг буруу байна'));
    }
    if (!user.isActive) {
      throw new ForbiddenException(err('auth.accountInactive', 'Таны хаяг идэвхгүй болсон байна. Админтай холбогдоно уу'));
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
    if (emailTaken) throw new ConflictException(err('auth.emailTaken', 'Энэ и-мэйл хаяг аль хэдийн бүртгэлтэй байна'));
    if (phoneTaken) throw new ConflictException(err('auth.phoneTaken', 'Энэ утасны дугаар аль хэдийн бүртгэлтэй байна'));

    const user = await this.prisma.user.create({
      data: {
        email: input.email,
        phone: input.phone ?? null,
        passwordHash: await this.hashPassword(input.password),
        firstName: input.firstName,
        lastName: input.lastName,
        role: Role.CLIENT,
        preferredLocale: input.locale ?? 'mn',
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
    if (!rawToken) throw new UnauthorizedException(err('auth.sessionMissing', 'Сесс олдсонгүй. Дахин нэвтэрнэ үү'));

    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: this.hashToken(rawToken) },
      include: { user: true },
    });
    if (!stored) throw new UnauthorizedException(err('auth.sessionInvalid', 'Сесс хүчингүй байна. Дахин нэвтэрнэ үү'));

    if (stored.revokedAt && !(await this.isConcurrentRefresh(stored))) {
      this.logger.warn(`Refresh token reuse detected for user ${stored.userId}; revoking all sessions`);
      await this.revokeAllForUser(stored.userId);
      throw new UnauthorizedException(err('auth.sessionRevoked', 'Сесс хүчингүй болсон. Аюулгүй байдлын үүднээс дахин нэвтэрнэ үү'));
    }
    if (stored.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException(err('auth.sessionExpired', 'Сессийн хугацаа дууссан. Дахин нэвтэрнэ үү'));
    }
    if (!stored.user.isActive) {
      throw new ForbiddenException(err('auth.accountDisabled', 'Таны хаяг идэвхгүй болсон байна'));
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
    if (!user) throw new UnauthorizedException(err('auth.userNotFound', 'Хэрэглэгч олдсонгүй'));
    return toSafeUser(user);
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  // ─── One-time links: password reset and invitations ────────────────────────

  /**
   * Starts a reset. Whether or not the address belongs to an account, the caller is told the same
   * thing — a different answer would turn this endpoint into a way to find out who is a client here.
   * Any earlier reset link for the same person stops working.
   */
  async requestPasswordReset(input: ForgotPasswordInput): Promise<void> {
    const identifier = input.identifier.trim();
    const user = identifier.includes('@')
      ? await this.prisma.user.findUnique({ where: { email: identifier.toLowerCase() } })
      : MN_PHONE_REGEX.test(identifier)
        ? await this.prisma.user.findUnique({ where: { phone: identifier.replace(/^\+976/, '') } })
        : null;
    if (!user || !user.isActive) {
      this.logger.log('Password reset requested for an address with no active account');
      return;
    }

    const { token, expiresAt } = await this.issueAuthToken(user.id, AuthTokenPurpose.PASSWORD_RESET, RESET_TTL_HOURS * 3_600_000);
    const locale = this.localeOf(user, input.locale);
    this.mail.enqueue({
      to: user.email,
      template: 'passwordReset',
      locale,
      userId: user.id,
      data: {
        name: user.firstName,
        url: this.linkUrl('/portal/reset-password', token, locale),
        hours: RESET_TTL_HOURS,
      },
    });
    this.logger.log(`Password reset link issued for user ${user.id}, valid until ${expiresAt.toISOString()}`);
  }

  /**
   * Finishes a reset: the link works once, every session of that account ends (a stolen password is
   * no longer enough), and the owner is told it happened — the one way a silent takeover is noticed.
   */
  async resetPassword(input: ResetPasswordInput): Promise<void> {
    const user = await this.consumeAuthToken(
      input.token,
      AuthTokenPurpose.PASSWORD_RESET,
      err('auth.linkInvalid', 'Сэргээх холбоос хүчингүй эсвэл хугацаа нь дууссан байна'),
    );
    await this.prisma.user.update({ where: { id: user.id }, data: { passwordHash: await this.hashPassword(input.password) } });
    await this.revokeAllForUser(user.id);
    const locale = this.localeOf(user);
    this.mail.enqueue({
      to: user.email,
      template: 'passwordChanged',
      locale,
      userId: user.id,
      data: { name: user.firstName, url: this.linkUrl('/portal/login', null, locale) },
    });
  }

  /** A new account finishes the same way a reset does, with the password the person chooses. */
  async acceptInvite(input: ResetPasswordInput): Promise<void> {
    const user = await this.consumeAuthToken(
      input.token,
      AuthTokenPurpose.INVITE,
      err('auth.inviteInvalid', 'Урилгын холбоос хүчингүй эсвэл хугацаа нь дууссан байна'),
    );
    await this.prisma.user.update({ where: { id: user.id }, data: { passwordHash: await this.hashPassword(input.password) } });
    await this.revokeAllForUser(user.id);
  }

  /**
   * Creates (or replaces) an invitation and sends it. Used when an account is opened for someone and
   * when an admin sends the invitation again; returns when it expires so the panel can show it.
   */
  async sendInvite(userId: string, locale?: UserLocale): Promise<{ expiresAt: Date }> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const { token, expiresAt } = await this.issueAuthToken(user.id, AuthTokenPurpose.INVITE, INVITE_TTL_DAYS * 86_400_000);
    const language = this.localeOf(user, locale);
    this.mail.enqueue({
      to: user.email,
      template: 'clientInvite',
      locale: language,
      userId: user.id,
      data: {
        name: user.firstName,
        url: this.linkUrl('/portal/accept-invite', token, language),
        days: INVITE_TTL_DAYS,
      },
    });
    return { expiresAt };
  }

  /** The state the admin panel shows next to an account: invited, expired, or already finished. */
  async inviteStatus(userId: string): Promise<{ state: 'NONE' | 'PENDING' | 'EXPIRED' | 'ACCEPTED'; expiresAt: Date | null }> {
    const latest = await this.prisma.authToken.findFirst({
      where: { userId, purpose: AuthTokenPurpose.INVITE },
      orderBy: { createdAt: 'desc' },
      select: { expiresAt: true, usedAt: true },
    });
    if (!latest) return { state: 'NONE', expiresAt: null };
    if (latest.usedAt) return { state: 'ACCEPTED', expiresAt: latest.expiresAt };
    return { state: latest.expiresAt.getTime() > Date.now() ? 'PENDING' : 'EXPIRED', expiresAt: latest.expiresAt };
  }

  // ─── Token internals ───────────────────────────────────────────────────────

  /** 32 random bytes; the database keeps only the hash, so the link cannot be rebuilt from a backup. */
  private async issueAuthToken(userId: string, purpose: AuthTokenPurpose, ttlMs: number): Promise<{ token: string; expiresAt: Date }> {
    // A new link invalidates the previous one of the same kind — two live reset links is one too many.
    await this.prisma.authToken.deleteMany({ where: { userId, purpose } });
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + ttlMs);
    await this.prisma.authToken.create({ data: { userId, purpose, tokenHash: this.hashToken(token), expiresAt } });
    return { token, expiresAt };
  }

  /** Checks a presented link and burns it. Unknown, used and expired all answer the same way. */
  private async consumeAuthToken(token: string, purpose: AuthTokenPurpose, failure: ReturnType<typeof err>): Promise<User> {
    const stored = await this.prisma.authToken.findUnique({
      where: { tokenHash: this.hashToken(token) },
      include: { user: true },
    });
    if (!stored || stored.purpose !== purpose || stored.usedAt || stored.expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException(failure);
    }
    if (!stored.user.isActive) throw new BadRequestException(failure);
    // Marked used and then removed: the row is gone, and a second request finds nothing either way.
    await this.prisma.authToken.deleteMany({ where: { userId: stored.userId, purpose } });
    return stored.user;
  }

  /** What language to write in: the account's own setting, or the one the browser was using. */
  private localeOf(user: { preferredLocale: string }, requested?: UserLocale): UserLocale {
    const stored = user.preferredLocale;
    if (stored === 'en' || stored === 'zh') return stored;
    return requested ?? 'mn';
  }

  /** Absolute link into the portal, in the reader's language. */
  private linkUrl(path: string, token: string | null, locale: UserLocale): string {
    const prefix = locale === 'mn' ? '' : `/${locale}`;
    const query = token ? `?token=${encodeURIComponent(token)}` : '';
    return `${this.mail.appUrl()}${prefix}${path}${query}`;
  }


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
