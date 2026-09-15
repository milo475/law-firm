import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  CLIENT_PAYABLE_INVOICE_STATUSES,
  INVOICE_STATUS_LABELS,
  InvoiceStatus,
  Role,
  type InvoicePaymentSummary,
  type MarkPaymentInput,
  type Prisma,
  type RejectPaymentInput,
} from '@law-firm/shared';
import { CasesService } from '../cases/cases.service';
import type { RequestUser } from '../common/types/request-user';
import { PrismaService } from '../prisma/prisma.service';
import {
  INVOICE_PAYMENT_EVENTS,
  type InvoicePaymentConfirmedEvent,
  type InvoicePaymentMarkedEvent,
  type InvoicePaymentRef,
  type InvoicePaymentRejectedEvent,
} from './invoice-payment.events';
import { INVOICE_SELECT } from './invoices.service';

const PAYMENT_LOAD_SELECT = {
  id: true,
  invoiceNumber: true,
  amount: true,
  status: true,
  case: { select: { id: true, caseNumber: true, clientId: true, lawyerId: true } },
} satisfies Prisma.InvoiceSelect;

type LoadedInvoice = Prisma.InvoiceGetPayload<{ select: typeof PAYMENT_LOAD_SELECT }>;

function toRef(invoice: LoadedInvoice): InvoicePaymentRef {
  return {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    amount: String(invoice.amount),
    caseId: invoice.case.id,
    caseNumber: invoice.case.caseNumber,
    clientId: invoice.case.clientId,
    lawyerId: invoice.case.lawyerId,
  };
}

/**
 * Bank transfer payments: the client reports a transfer (AWAITING_CONFIRMATION),
 * then ADMIN or the assigned LAWYER confirms it (PAID) or rejects it with a reason (back to SENT).
 */
@Injectable()
export class InvoicePaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cases: CasesService,
    private readonly events: EventEmitter2,
  ) {}

  /** The case's CLIENT reports that a SENT or OVERDUE invoice was paid. */
  async markPaid(id: string, input: MarkPaymentInput, user: RequestUser) {
    const invoice = await this.load(id);
    if (user.role !== Role.CLIENT || invoice.case.clientId !== user.id) {
      throw new ForbiddenException('Энэ нэхэмжлэхийн төлбөрийг тэмдэглэх эрх танд байхгүй байна');
    }
    if (!(CLIENT_PAYABLE_INVOICE_STATUSES as readonly InvoiceStatus[]).includes(invoice.status)) {
      throw new BadRequestException(
        invoice.status === InvoiceStatus.AWAITING_CONFIRMATION
          ? 'Төлбөрийг аль хэдийн тэмдэглэсэн, баталгаажуулалт хүлээгдэж байна'
          : `«${INVOICE_STATUS_LABELS[invoice.status]}» төлөвтэй нэхэмжлэхийг төлсөн гэж тэмдэглэх боломжгүй`,
      );
    }

    const paymentNote = input.paymentNote?.trim() ? input.paymentNote.trim() : null;
    await this.move(id, invoice.status, {
      status: InvoiceStatus.AWAITING_CONFIRMATION,
      paymentMarkedAt: new Date(),
      paymentNote,
      paymentRejectedAt: null,
      paymentRejectionReason: null,
    });
    const updated = await this.fetch(id);

    const event: InvoicePaymentMarkedEvent = { invoice: toRef(invoice), actorId: user.id, paymentNote };
    await this.events.emitAsync(INVOICE_PAYMENT_EVENTS.marked, event);
    return updated;
  }

  /** ADMIN or the assigned LAWYER confirms the reported payment: PAID, paidAt and confirmedBy are set. */
  async confirm(id: string, user: RequestUser) {
    const invoice = await this.loadForStaff(id, user);
    this.assertAwaiting(invoice, 'баталгаажуулах');
    await this.move(id, InvoiceStatus.AWAITING_CONFIRMATION, {
      status: InvoiceStatus.PAID,
      paidAt: new Date(),
      confirmedById: user.id,
    });
    const updated = await this.fetch(id);

    const event: InvoicePaymentConfirmedEvent = { invoice: toRef(invoice), actorId: user.id };
    await this.events.emitAsync(INVOICE_PAYMENT_EVENTS.confirmed, event);
    return updated;
  }

  /** ADMIN or the assigned LAWYER rejects the report (e.g. amount mismatch): back to SENT with the reason. */
  async reject(id: string, input: RejectPaymentInput, user: RequestUser) {
    const invoice = await this.loadForStaff(id, user);
    this.assertAwaiting(invoice, 'татгалзах');
    const reason = input.reason.trim();
    await this.move(id, InvoiceStatus.AWAITING_CONFIRMATION, {
      status: InvoiceStatus.SENT,
      paymentRejectedAt: new Date(),
      paymentRejectionReason: reason,
      paidAt: null,
      confirmedById: null,
    });
    const updated = await this.fetch(id);

    const event: InvoicePaymentRejectedEvent = { invoice: toRef(invoice), actorId: user.id, reason };
    await this.events.emitAsync(INVOICE_PAYMENT_EVENTS.rejected, event);
    return updated;
  }

  /** Reported payments waiting for confirmation, within the user's case scope (sidebar badge). */
  async summary(user: RequestUser): Promise<InvoicePaymentSummary> {
    const where: Prisma.InvoiceWhereInput = { status: InvoiceStatus.AWAITING_CONFIRMATION, case: this.cases.scopeFor(user) };
    const [rows, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        select: { id: true, invoiceNumber: true, amount: true, paymentMarkedAt: true, case: { select: { id: true, caseNumber: true } } },
        orderBy: { paymentMarkedAt: 'asc' },
        take: 50,
      }),
      this.prisma.invoice.count({ where }),
    ]);
    return {
      total,
      invoices: rows.map((row) => ({
        id: row.id,
        invoiceNumber: row.invoiceNumber,
        amount: String(row.amount),
        caseId: row.case.id,
        caseNumber: row.case.caseNumber,
        paymentMarkedAt: row.paymentMarkedAt,
      })),
    };
  }

  // ─── helpers ───────────────────────────────────────────────────────────────

  private async load(id: string): Promise<LoadedInvoice> {
    const invoice = await this.prisma.invoice.findUnique({ where: { id }, select: PAYMENT_LOAD_SELECT });
    if (!invoice) throw new NotFoundException('Нэхэмжлэх олдсонгүй');
    return invoice;
  }

  private async loadForStaff(id: string, user: RequestUser): Promise<LoadedInvoice> {
    const invoice = await this.load(id);
    this.cases.assertStaffAccess(invoice.case, user);
    return invoice;
  }

  private assertAwaiting(invoice: LoadedInvoice, action: string): void {
    if (invoice.status !== InvoiceStatus.AWAITING_CONFIRMATION) {
      throw new BadRequestException(
        `«${INVOICE_STATUS_LABELS[invoice.status]}» төлөвтэй нэхэмжлэхийн төлбөрийг ${action} боломжгүй. Зөвхөн «Баталгаажуулж буй» нэхэмжлэх`,
      );
    }
  }

  /** Status-guarded write so a concurrent confirm/reject cannot be overwritten. */
  private async move(id: string, from: InvoiceStatus, data: Prisma.InvoiceUncheckedUpdateManyInput): Promise<void> {
    const result = await this.prisma.invoice.updateMany({ where: { id, status: from }, data });
    if (result.count === 0) throw new ConflictException('Нэхэмжлэхийн төлөв өөрчлөгдсөн байна. Хуудсаа шинэчилнэ үү');
  }

  private async fetch(id: string) {
    const invoice = await this.prisma.invoice.findUniqueOrThrow({ where: { id }, select: INVOICE_SELECT });
    return { ...invoice, amount: String(invoice.amount) };
  }
}
