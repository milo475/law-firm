import { Injectable, NotFoundException } from '@nestjs/common';
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
}
