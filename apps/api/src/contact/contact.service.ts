import { Injectable } from '@nestjs/common';
import type { ContactQueryInput, Paginated, Prisma } from '@law-firm/shared';
import { paginate, skipTake } from '../common/utils/pagination';
import { PrismaService } from '../prisma/prisma.service';

/** The public contact form was replaced by service requests; its earlier messages stay readable for admins. */
@Injectable()
export class ContactService {
  constructor(private readonly prisma: PrismaService) {}

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
}
