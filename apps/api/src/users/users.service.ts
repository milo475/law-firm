import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  Role,
  type ChangePasswordInput,
  type CreateUserInput,
  type Paginated,
  type Prisma,
  type SafeUser,
  type UpdateMeInput,
  type UpdateUserInput,
  type UserQueryInput,
} from '@law-firm/shared';
import { AuthService } from '../auth/auth.service';
import { paginate, skipTake } from '../common/utils/pagination';
import { SAFE_USER_SELECT } from '../common/utils/safe-user';
import { PrismaService } from '../prisma/prisma.service';

const ADMIN_USER_SELECT = { ...SAFE_USER_SELECT, lawyerProfile: true } satisfies Prisma.UserSelect;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
  ) {}

  // ─── Admin CRUD ────────────────────────────────────────────────────────────

  async findAll(query: UserQueryInput): Promise<Paginated<unknown>> {
    const where: Prisma.UserWhereInput = {
      ...(query.role ? { role: query.role } : {}),
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

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: ADMIN_USER_SELECT });
    if (!user) throw new NotFoundException('Хэрэглэгч олдсонгүй');
    return user;
  }

  async create(input: CreateUserInput) {
    await this.assertUnique(input.email, input.phone ?? null);
    if (input.lawyerProfile && input.role !== Role.LAWYER) {
      throw new BadRequestException('Хуульчийн профайл зөвхөн LAWYER эрхтэй хэрэглэгчид байна');
    }
    return this.prisma.user.create({
      data: {
        email: input.email,
        phone: input.phone ?? null,
        passwordHash: await this.auth.hashPassword(input.password),
        firstName: input.firstName,
        lastName: input.lastName,
        role: input.role,
        isActive: input.isActive,
        ...(input.lawyerProfile ? { lawyerProfile: { create: input.lawyerProfile } } : {}),
      },
      select: ADMIN_USER_SELECT,
    });
  }

  async update(id: string, input: UpdateUserInput) {
    const existing = await this.prisma.user.findUnique({ where: { id }, include: { lawyerProfile: true } });
    if (!existing) throw new NotFoundException('Хэрэглэгч олдсонгүй');

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
        throw new BadRequestException('Хуульчийн профайл зөвхөн LAWYER эрхтэй хэрэглэгчид байна');
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
    if (id === actingUserId) throw new BadRequestException('Та өөрийгөө идэвхгүй болгох боломжгүй');
    const user = await this.prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (!user) throw new NotFoundException('Хэрэглэгч олдсонгүй');
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
      if (taken) throw new ConflictException('Энэ утасны дугаар өөр хэрэглэгч дээр бүртгэлтэй байна');
    }
    return this.prisma.user.update({ where: { id: userId }, data: input, select: SAFE_USER_SELECT });
  }

  async changePassword(userId: string, input: ChangePasswordInput): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Хэрэглэгч олдсонгүй');
    if (!(await this.auth.verifyPassword(user.passwordHash, input.currentPassword))) {
      throw new BadRequestException('Одоогийн нууц үг буруу байна');
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
    if (clash.email === email) throw new ConflictException('Энэ и-мэйл хаяг аль хэдийн бүртгэлтэй байна');
    throw new ConflictException('Энэ утасны дугаар аль хэдийн бүртгэлтэй байна');
  }
}
