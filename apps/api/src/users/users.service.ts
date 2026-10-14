import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  Role,
  type AdminCreateUserInput,
  type ChangePasswordInput,
  type Paginated,
  type Prisma,
  type SafeUser,
  type UserLocale,
  type UpdateMeInput,
  type UpdateUserInput,
  type UserQueryInput,
} from '@law-firm/shared';
import { AuthService } from '../auth/auth.service';
import { err } from '../common/errors/app-error';
import type { RequestUser } from '../common/types/request-user';
import { paginate, skipTake } from '../common/utils/pagination';
import { SAFE_USER_SELECT } from '../common/utils/safe-user';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { generateTemporaryPassword } from './temporary-password';

const ADMIN_USER_SELECT = { ...SAFE_USER_SELECT, lawyerProfile: true } satisfies Prisma.UserSelect;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
    private readonly mail: MailService,
  ) {}

  // ─── Admin CRUD ────────────────────────────────────────────────────────────

  /** ADMIN lists everyone; a LAWYER can only look up clients (e.g. to open a case). */
  async findAll(query: UserQueryInput, actor: RequestUser): Promise<Paginated<unknown>> {
    const role = actor.role === Role.LAWYER ? Role.CLIENT : query.role;
    const where: Prisma.UserWhereInput = {
      ...(role ? { role } : {}),
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
      ...(query.search
        ? {
            OR: [
              { email: { contains: query.search, mode: 'insensitive' } },
              { phone: { contains: query.search } },
              { firstName: { contains: query.search, mode: 'insensitive' } },
              { lastName: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: ADMIN_USER_SELECT,
        orderBy: { createdAt: 'desc' },
        ...skipTake(query.page, query.limit),
      }),
      this.prisma.user.count({ where }),
    ]);
    return paginate(items, total, query.page, query.limit);
  }

  async findOne(id: string, actor: RequestUser) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: ADMIN_USER_SELECT });
    if (!user) throw new NotFoundException(err('user.notFound', 'Хэрэглэгч олдсонгүй'));
    if (actor.role === Role.LAWYER && user.role !== Role.CLIENT) {
      throw new ForbiddenException(err('user.clientsOnly', 'Та зөвхөн харилцагчийн мэдээллийг харах боломжтой'));
    }
    // So the panel can say whether the invitation is still waiting, and offer to send it again.
    return { ...user, invite: await this.auth.inviteStatus(id) };
  }

  /**
   * Creates a LAWYER or CLIENT.
   *
   * Nobody should have to be told a password over the phone, so by default the new account gets an
   * invitation e-mail and chooses its own. Two exceptions keep the panel usable: an admin who typed
   * a password gets exactly that, and when e-mail is switched off (local development, or SMTP not
   * configured yet) the old temporary password is generated and shown once, since otherwise there
   * would be no way in at all.
   */
  async create(input: AdminCreateUserInput, locale?: UserLocale): Promise<{
    user: unknown;
    temporaryPassword: string | null;
    invite: { expiresAt: Date } | null;
  }> {
    await this.assertUnique(input.email, input.phone ?? null);
    const invited = !input.password && this.mail.enabled;
    // An invited account still needs a password column; this one is random and never shown to anyone.
    const temporaryPassword = input.password || invited ? null : generateTemporaryPassword();
    const initialPassword = input.password ?? temporaryPassword ?? generateTemporaryPassword();

    const user = await this.prisma.user.create({
      data: {
        email: input.email,
        phone: input.phone ?? null,
        passwordHash: await this.auth.hashPassword(initialPassword),
        firstName: input.firstName,
        lastName: input.lastName,
        role: input.role,
        isActive: input.isActive,
        preferredLocale: locale ?? 'mn',
      },
      select: ADMIN_USER_SELECT,
    });

    const invite = invited ? await this.auth.sendInvite((user as { id: string }).id, locale) : null;
    return { user, temporaryPassword, invite };
  }

  /** Sends the invitation again — the link the person was given has expired, or never arrived. */
  async resendInvite(id: string): Promise<{ expiresAt: Date }> {
    const user = await this.prisma.user.findUnique({ where: { id }, select: { id: true, isActive: true } });
    if (!user) throw new NotFoundException(err('user.notFound', 'Хэрэглэгч олдсонгүй'));
    return this.auth.sendInvite(id);
  }

  async update(id: string, input: UpdateUserInput) {
    const existing = await this.prisma.user.findUnique({ where: { id }, include: { lawyerProfile: true } });
    if (!existing) throw new NotFoundException(err('user.notFound', 'Хэрэглэгч олдсонгүй'));

    if ((input.email && input.email !== existing.email) || (input.phone && input.phone !== existing.phone)) {
      await this.assertUnique(input.email ?? existing.email, input.phone ?? null, id);
    }

    const role = input.role ?? existing.role;
    const { lawyerProfile, password, ...rest } = input;

    const data: Prisma.UserUpdateInput = {
      ...rest,
      ...(password ? { passwordHash: await this.auth.hashPassword(password) } : {}),
    };

    if (lawyerProfile) {
      if (role !== Role.LAWYER) {
        throw new BadRequestException(err('user.lawyerRoleOnly', 'Хуульчийн профайл зөвхөн LAWYER эрхтэй хэрэглэгчид байна'));
      }
      data.lawyerProfile = existing.lawyerProfile
        ? { update: lawyerProfile }
        : {
            create: {
              title: lawyerProfile.title ?? '',
              bio: lawyerProfile.bio ?? '',
              education: lawyerProfile.education ?? '',
              specializations: lawyerProfile.specializations ?? [],
              yearsOfExperience: lawyerProfile.yearsOfExperience ?? 0,
              isPublic: lawyerProfile.isPublic ?? true,
              sortOrder: lawyerProfile.sortOrder ?? 0,
            },
          };
    }

    const updated = await this.prisma.user.update({ where: { id }, data, select: ADMIN_USER_SELECT });
    if (input.isActive === false || password) {
      await this.auth.revokeAllForUser(id);
    }
    return updated;
  }

  /** Soft delete: deactivates the account and kills every session (rows stay for audit/FK integrity). */
  async deactivate(id: string, actingUserId: string): Promise<void> {
    if (id === actingUserId) throw new BadRequestException(err('user.cannotDeactivateSelf', 'Та өөрийгөө идэвхгүй болгох боломжгүй'));
    const user = await this.prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (!user) throw new NotFoundException(err('user.notFound', 'Хэрэглэгч олдсонгүй'));
    await this.prisma.user.update({ where: { id }, data: { isActive: false } });
    await this.auth.revokeAllForUser(id);
  }

  // ─── Self-service ──────────────────────────────────────────────────────────

  async updateMe(userId: string, input: UpdateMeInput): Promise<SafeUser> {
    if (input.phone) {
      const taken = await this.prisma.user.findFirst({
        where: { phone: input.phone, NOT: { id: userId } },
        select: { id: true },
      });
      if (taken) throw new ConflictException(err('user.phoneTaken', 'Энэ утасны дугаар өөр хэрэглэгч дээр бүртгэлтэй байна'));
    }
    return this.prisma.user.update({ where: { id: userId }, data: input, select: SAFE_USER_SELECT });
  }

  async changePassword(userId: string, input: ChangePasswordInput): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException(err('user.notFound', 'Хэрэглэгч олдсонгүй'));
    if (!(await this.auth.verifyPassword(user.passwordHash, input.currentPassword))) {
      throw new BadRequestException(err('user.currentPasswordWrong', 'Одоогийн нууц үг буруу байна'));
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await this.auth.hashPassword(input.newPassword) },
    });
    await this.auth.revokeAllForUser(userId);
  }

  // ─── helpers ───────────────────────────────────────────────────────────────

  private async assertUnique(email: string, phone: string | null, excludeId?: string) {
    const clash = await this.prisma.user.findFirst({
      where: {
        OR: [{ email }, ...(phone ? [{ phone }] : [])],
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
      select: { email: true, phone: true },
    });
    if (!clash) return;
    if (clash.email === email) throw new ConflictException(err('user.emailTaken', 'Энэ и-мэйл хаяг аль хэдийн бүртгэлтэй байна'));
    throw new ConflictException(err('user.phoneTaken', 'Энэ утасны дугаар аль хэдийн бүртгэлтэй байна'));
  }
}
