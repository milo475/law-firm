import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  INVOICE_NUMBER_PREFIX,
  INVOICE_STATUS_LABELS,
  InvoiceStatus,
  canTransitionInvoice,
  nextSequenceNumber,
  type CreateInvoiceInput,
  type InvoiceQueryInput,
  type Paginated,
  type Prisma,
  type UpdateInvoiceInput,
} from '@law-firm/shared';
import { CasesService } from '../cases/cases.service';
import type { RequestUser } from '../common/types/request-user';
import { formatDateMn, formatMoneyMn, isUniqueViolation } from '../common/utils/format';
import { paginate, skipTake } from '../common/utils/pagination';
import { NotificationsService } from '../notifications/notifications.service';
import { PUBLIC_USER_SELECT } from '../common/utils/safe-user';
import { PrismaService } from '../prisma/prisma.service';

export const INVOICE_SELECT = {
  id: true,
  invoiceNumber: true,
  amount: true,
  description: true,
  status: true,
  dueDate: true,
  paidAt: true,
  paymentMarkedAt: true,
  paymentNote: true,
  paymentRejectedAt: true,
  paymentRejectionReason: true,
  confirmedBy: { select: PUBLIC_USER_SELECT },
  createdAt: true,
  updatedAt: true,
  case: { select: { id: true, caseNumber: true, title: true } },
} satisfies Prisma.InvoiceSelect;

const MAX_NUMBER_ATTEMPTS = 3;

@Injectable()
export class InvoicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cases: CasesService,
    private readonly notifications: NotificationsService,
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

  /** ADMIN or the case's assigned LAWYER. New invoices always start as DRAFT. */
  async create(input: CreateInvoiceInput, user: RequestUser) {
    await this.cases.assertStaffAccessById(input.caseId, user);

    for (let attempt = 1; ; attempt += 1) {
      const invoiceNumber = await this.generateInvoiceNumber();
      try {
        const created = await this.prisma.invoice.create({
          data: {
            invoiceNumber,
            caseId: input.caseId,
            amount: input.amount.toFixed(2),
            description: input.description,
            dueDate: input.dueDate,
            status: InvoiceStatus.DRAFT,
          },
          select: INVOICE_SELECT,
        });
        return this.serialize(created);
      } catch (error) {
        if (isUniqueViolation(error) && attempt < MAX_NUMBER_ATTEMPTS) continue;
        throw error;
      }
    }
  }

  /**
   * Status must follow INVOICE_STATUS_TRANSITIONS (DRAFT → SENT → PAID, or → CANCELLED; PAID is final).
   * Amount / description / due date are editable only while DRAFT. SENT notifies the client; PAID sets paidAt.
   */
  async update(id: string, input: UpdateInvoiceInput, user: RequestUser) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      select: {
        id: true,
        invoiceNumber: true,
        status: true,
        dueDate: true,
        amount: true,
        case: { select: { id: true, caseNumber: true, clientId: true, lawyerId: true } },
      },
    });
    if (!invoice) throw new NotFoundException('Нэхэмжлэх олдсонгүй');
    this.cases.assertStaffAccess(invoice.case, user);

    const nextStatus = input.status ?? invoice.status;
    if (!canTransitionInvoice(invoice.status, nextStatus)) {
      throw new BadRequestException(
        `Нэхэмжлэхийн төлөвийг «${INVOICE_STATUS_LABELS[invoice.status]}»-аас «${INVOICE_STATUS_LABELS[nextStatus]}» болгох боломжгүй`,
      );
    }
    if (
      nextStatus !== invoice.status &&
      (nextStatus === InvoiceStatus.AWAITING_CONFIRMATION || invoice.status === InvoiceStatus.AWAITING_CONFIRMATION)
    ) {
      throw new BadRequestException('Төлбөрийн баталгаажуулалтыг «Төлбөр баталгаажуулах» эсвэл «Татгалзах» үйлдлээр хийнэ');
    }
    const editsContent = input.amount !== undefined || input.description !== undefined || input.dueDate !== undefined;
    if (editsContent && invoice.status !== InvoiceStatus.DRAFT) {
      throw new BadRequestException('Зөвхөн ноорог нэхэмжлэхийн дүн, тайлбар, хугацааг засах боломжтой');
    }

    const statusChanged = nextStatus !== invoice.status;
    const updated = await this.prisma.invoice.update({
      where: { id },
      data: {
        ...(input.amount !== undefined ? { amount: input.amount.toFixed(2) } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.dueDate !== undefined ? { dueDate: input.dueDate } : {}),
        ...(statusChanged ? { status: nextStatus } : {}),
        ...(statusChanged && nextStatus === InvoiceStatus.PAID ? { paidAt: new Date(), confirmedById: user.id } : {}),
      },
      select: INVOICE_SELECT,
    });

    if (statusChanged && nextStatus === InvoiceStatus.SENT) {
      await this.notifications.createMany([
        {
          userId: invoice.case.clientId,
          type: 'INVOICE',
          title: 'Шинэ нэхэмжлэх ирлээ',
          body: `${updated.invoiceNumber} · ${formatMoneyMn(String(updated.amount))} · төлөх хугацаа ${formatDateMn(updated.dueDate)}`,
          link: `/portal/invoices/${id}`,
        },
      ]);
    }

    return this.serialize(updated);
  }

  private async generateInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const last = await this.prisma.invoice.findFirst({
      where: { invoiceNumber: { startsWith: `${INVOICE_NUMBER_PREFIX}-${year}-` } },
      orderBy: { invoiceNumber: 'desc' },
      select: { invoiceNumber: true },
    });
    return nextSequenceNumber(INVOICE_NUMBER_PREFIX, year, last?.invoiceNumber ?? null);
  }

  /** Prisma Decimal → string so JSON keeps full precision. */
  private serialize<T extends { amount: unknown }>(invoice: T) {
    return { ...invoice, amount: String(invoice.amount) };
  }
}
