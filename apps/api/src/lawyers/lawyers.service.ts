import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Role, type CreateLawyerProfileInput, type UpdateLawyerProfileInput } from '@law-firm/shared';
import type { RequestUser } from '../common/types/request-user';
import { PrismaService } from '../prisma/prisma.service';

const LAWYER_SELECT = {
  id: true,
  title: true,
  bio: true,
  specializations: true,
  education: true,
  yearsOfExperience: true,
  sortOrder: true,
  user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, email: true, phone: true } },
} as const;

const STAFF_LAWYER_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  avatarUrl: true,
  role: true,
  isActive: true,
  lawyerProfile: true,
} as const;

@Injectable()
export class LawyersService {
  constructor(private readonly prisma: PrismaService) {}

  /** Public team listing — only public profiles of active users. */
  findAll() {
    return this.prisma.lawyerProfile.findMany({
      where: { isPublic: true, user: { isActive: true } },
      select: LAWYER_SELECT,
      orderBy: [{ sortOrder: 'asc' }, { user: { lastName: 'asc' } }],
    });
  }

  /** Accepts either the profile id or the lawyer's user id. */
  async findOne(id: string) {
    const profile = await this.prisma.lawyerProfile.findFirst({
      where: { OR: [{ id }, { userId: id }], isPublic: true, user: { isActive: true } },
      select: LAWYER_SELECT,
    });
    if (!profile) throw new NotFoundException('Хуульч олдсонгүй');
    return profile;
  }

  // ─── Profile management (ADMIN, or the lawyer themselves) ─────────────────

  /** Lawyer user + profile (profile may be null), including non-public profiles. */
  async findForStaff(userId: string, actor: RequestUser) {
    this.assertProfileAccess(userId, actor);
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: STAFF_LAWYER_SELECT });
    if (!user || user.role !== Role.LAWYER) throw new NotFoundException('Хуульч олдсонгүй');
    return user;
  }

  async createProfile(userId: string, input: CreateLawyerProfileInput, actor: RequestUser) {
    this.assertProfileAccess(userId, actor);
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true } });
    if (!user) throw new NotFoundException('Хэрэглэгч олдсонгүй');
    if (user.role !== Role.LAWYER) throw new BadRequestException('Профайлыг зөвхөн хуульч эрхтэй хэрэглэгчид үүсгэнэ');
    const existing = await this.prisma.lawyerProfile.findUnique({ where: { userId }, select: { id: true } });
    if (existing) throw new ConflictException('Энэ хуульчийн профайл аль хэдийн үүссэн байна');
    return this.prisma.lawyerProfile.create({ data: { ...input, userId } });
  }

  async updateProfile(userId: string, input: UpdateLawyerProfileInput, actor: RequestUser) {
    this.assertProfileAccess(userId, actor);
    const existing = await this.prisma.lawyerProfile.findUnique({ where: { userId }, select: { id: true } });
    if (!existing) throw new NotFoundException('Профайл олдсонгүй. Эхлээд профайл үүсгэнэ үү');
    return this.prisma.lawyerProfile.update({ where: { userId }, data: input });
  }

  private assertProfileAccess(userId: string, actor: RequestUser): void {
    if (actor.role === Role.ADMIN) return;
    if (actor.role === Role.LAWYER && actor.id === userId) return;
    throw new ForbiddenException('Та зөвхөн өөрийн профайлыг удирдах боломжтой');
  }
}
