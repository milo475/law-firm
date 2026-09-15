import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Role } from '@law-firm/shared';
import { formatMoneyMn } from '../common/utils/format';
import { NotificationsService, type CreateNotificationInput } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  INVOICE_PAYMENT_EVENTS,
  type InvoicePaymentConfirmedEvent,
  type InvoicePaymentMarkedEvent,
  type InvoicePaymentRejectedEvent,
} from './invoice-payment.events';

const TYPE = 'INVOICE';
const staffLink = (id: string) => `/admin/invoices/${id}`;
const clientLink = (id: string) => `/portal/invoices/${id}`;

/** Payment events → notifications. Failures are logged and never fail the payment action itself. */
@Injectable()
export class InvoicePaymentNotificationsListener {
  private readonly logger = new Logger(InvoicePaymentNotificationsListener.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /** The assigned lawyer and every active admin are asked to confirm. */
  @OnEvent(INVOICE_PAYMENT_EVENTS.marked)
  async onMarked(event: InvoicePaymentMarkedEvent): Promise<void> {
    const { invoice } = event;
    await this.safely(invoice.invoiceNumber, async () => {
      const admins = await this.prisma.user.findMany({ where: { role: Role.ADMIN, isActive: true }, select: { id: true } });
      const recipients = [...new Set([invoice.lawyerId, ...admins.map((admin) => admin.id)])];
      const note = event.paymentNote ? ` · ${excerpt(event.paymentNote)}` : '';
      return recipients.map((userId) => ({
        userId,
        type: TYPE,
        title: `Төлбөр хийгдсэн гэж тэмдэглэлээ, баталгаажуулна уу: ${invoice.invoiceNumber}`,
        body: `${invoice.caseNumber} · ${formatMoneyMn(invoice.amount)}${note}`,
        link: staffLink(invoice.id),
        actorId: event.actorId,
      }));
    });
  }

  @OnEvent(INVOICE_PAYMENT_EVENTS.confirmed)
  async onConfirmed(event: InvoicePaymentConfirmedEvent): Promise<void> {
    const { invoice } = event;
    await this.safely(invoice.invoiceNumber, async () => [
      {
        userId: invoice.clientId,
        type: TYPE,
        title: `Төлбөр баталгаажлаа: ${invoice.invoiceNumber}`,
        body: `${formatMoneyMn(invoice.amount)} · ${invoice.caseNumber}`,
        link: clientLink(invoice.id),
        actorId: event.actorId,
      },
    ]);
  }

  @OnEvent(INVOICE_PAYMENT_EVENTS.rejected)
  async onRejected(event: InvoicePaymentRejectedEvent): Promise<void> {
    const { invoice } = event;
    await this.safely(invoice.invoiceNumber, async () => [
      {
        userId: invoice.clientId,
        type: TYPE,
        title: excerpt(`Төлбөр баталгаажсангүй: ${event.reason}`, 180),
        body: `${invoice.invoiceNumber} · ${formatMoneyMn(invoice.amount)} · дахин шалгаад тэмдэглэнэ үү`,
        link: clientLink(invoice.id),
        actorId: event.actorId,
      },
    ]);
  }

  private async safely(invoiceNumber: string, build: () => Promise<CreateNotificationInput[]>): Promise<void> {
    try {
      await this.notifications.createMany(await build());
    } catch (error) {
      this.logger.error(`Could not create payment notifications for ${invoiceNumber}: ${(error as Error).message}`);
    }
  }
}

function excerpt(text: string, max = 120): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}
