import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  CONTACT_STATUS_LABELS,
  Role,
  canTransitionContact,
  type ContactQueryInput,
  type ContactRequestInput,
  type ContactStatus,
  type Paginated,
  type Prisma,
} from '@law-firm/shared';
import { paginate, skipTake } from '../common/utils/pagination';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ContactService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Public form submission; every active admin gets an in-app notification. */
  async create(input: ContactRequestInput) {
    const request = await this.prisma.contactRequest.create({
      data: { ...input, email: input.email ?? null },
    });

    const admins = await this.prisma.user.findMany({
      where: { role: Role.ADMIN, isActive: true },
      select: { id: true },
    });
    await this.notifications.createMany(
      admins.map((admin) => ({
        userId: admin.id,
        type: 'CONTACT_REQUEST',
        title: 'Шинэ холбоо барих хүсэлт',
        body: `${input.name} (${input.phone}): ${input.subject}`,
        link: `/admin/contact?focus=${request.id}`,
      })),
    );

    return { id: request.id, message: 'Таны хүсэлтийг хүлээн авлаа. Бид тантай удахгүй холбогдоно' };
  }

  async findAll(query: ContactQueryInput): Promise<Paginated<unknown>> {
    const where: Prisma.ContactRequestWhereInput = query.status ? { status: query.status } : {};
    const [items, total] = await Promise.all([
      this.prisma.contactRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        ...skipTake(query.page, query.limit),
      }),
      this.prisma.contactRequest.count({ where }),
    ]);
    return paginate(items, total, query.page, query.limit);
  }

  /** Forward-only: NEW → CONTACTED → CLOSED (NEW → CLOSED allowed). */
  async updateStatus(id: string, status: ContactStatus) {
    const existing = await this.prisma.contactRequest.findUnique({ where: { id }, select: { id: true, status: true } });
    if (!existing) throw new NotFoundException('Хүсэлт олдсонгүй');
    if (!canTransitionContact(existing.status, status)) {
      throw new BadRequestException(
        `Хүсэлтийн төлөвийг «${CONTACT_STATUS_LABELS[existing.status]}»-аас «${CONTACT_STATUS_LABELS[status]}» болгох боломжгүй`,
      );
    }
    if (existing.status === status) return this.prisma.contactRequest.findUnique({ where: { id } });
    return this.prisma.contactRequest.update({ where: { id }, data: { status } });
  }
}
