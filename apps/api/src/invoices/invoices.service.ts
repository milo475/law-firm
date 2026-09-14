import { Injectable, NotFoundException } from '@nestjs/common';
import type { InvoiceQueryInput, Paginated, Prisma } from '@law-firm/shared';
import { CasesService } from '../cases/cases.service';
import type { RequestUser } from '../common/types/request-user';
import { paginate, skipTake } from '../common/utils/pagination';
import { PrismaService } from '../prisma/prisma.service';

const INVOICE_SELECT = {
  id: true,
  invoiceNumber: true,
  amount: true,
  description: true,
  status: true,
  dueDate: true,
  paidAt: true,
  createdAt: true,
  updatedAt: true,
  case: { select: { id: true, caseNumber: true, title: true } },
} satisfies Prisma.InvoiceSelect;

@Injectable()
export class InvoicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cases: CasesService,
  ) {}

  /** Invoices are scoped through their case (client / assigned lawyer / admin). */
  async findAll(query: InvoiceQueryInput, user: RequestUser): Promise<Paginated<unknown>> {
    const where: Prisma.InvoiceWhereInput = {
      case: this.cases.scopeFor(user),
      ...(query.status ? { status: query.status } : {}),
      ...(query.caseId ? { caseId: query.caseId } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        select: INVOICE_SELECT,
        orderBy: [{ status: 'asc' }, { dueDate: 'desc' }],
        ...skipTake(query.page, query.limit),
      }),
      this.prisma.invoice.count({ where }),
    ]);
    return paginate(rows.map(this.serialize), total, query.page, query.limit);
  }

  async findOne(id: string, user: RequestUser) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      select: { ...INVOICE_SELECT, case: { select: { id: true, caseNumber: true, title: true, clientId: true, lawyerId: true } } },
    });
    if (!invoice) throw new NotFoundException('Нэхэмжлэх олдсонгүй');
    this.cases.assertAccess(invoice.case, user);
    return this.serialize(invoice);
  }

  /** Prisma Decimal → string so JSON keeps full precision. */
  private serialize<T extends { amount: unknown }>(invoice: T) {
    return { ...invoice, amount: String(invoice.amount) };
  }
}
