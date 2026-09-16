import { Injectable, Logger } from '@nestjs/common';
import { DocumentRequestStatus, InvoiceStatus, TaskStatus, type Prisma } from '@law-firm/shared';
import { formatDateMn, formatMoneyMn } from '../common/utils/format';
import { NotificationsService, type CreateNotificationInput } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';

const ACTIVE_TASK_STATUSES: TaskStatus[] = [TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.REVIEW];
const WAITING_ON_CLIENT: DocumentRequestStatus[] = [DocumentRequestStatus.PENDING, DocumentRequestStatus.REJECTED];

interface ReminderSummary {
  tasksOverdue: number;
  tasksDueSoon: number;
  invoicesMarkedOverdue: number;
  invoicesDueTomorrow: number;
  documentRequestsOverdue: number;
  notifications: number;
}

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const addDays = (date: Date, days: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

/**
 * Daily reminders. Day boundaries are in server local time: "overdue" = due before today, "due soon" = due today or
 * tomorrow. Each task, invoice and document request gets at most one reminder per day: a row is claimed by setting
 * lastReminderAt = now only if it was not already set today, and notifications go only to the rows claimed by this run.
 */
@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async runDaily(now = new Date()): Promise<ReminderSummary> {
    const today = startOfDay(now);
    const summary: ReminderSummary = { tasksOverdue: 0, tasksDueSoon: 0, invoicesMarkedOverdue: 0, invoicesDueTomorrow: 0, documentRequestsOverdue: 0, notifications: 0 };
    const inputs: CreateNotificationInput[] = [];

    inputs.push(...(await this.taskReminders(now, today, summary)));
    inputs.push(...(await this.overdueInvoices(now, today, summary)));
    inputs.push(...(await this.invoicesDueTomorrow(now, today, summary)));
    inputs.push(...(await this.documentRequestReminders(now, today, summary)));

    if (inputs.length > 0) await this.notifications.createMany(inputs);
    summary.notifications = inputs.length;
    this.logger.log(`Daily reminders: ${JSON.stringify(summary)}`);
    return summary;
  }

  private notRemindedToday(today: Date) {
    return { OR: [{ lastReminderAt: null }, { lastReminderAt: { lt: today } }] };
  }

  private async taskReminders(now: Date, today: Date, summary: ReminderSummary): Promise<CreateNotificationInput[]> {
    const tomorrow = addDays(today, 1);
    const where: Prisma.TaskWhereInput = { status: { in: ACTIVE_TASK_STATUSES }, dueDate: { lt: addDays(today, 2) }, ...this.notRemindedToday(today) };
    const candidates = await this.prisma.task.findMany({ where, select: { id: true } });
    if (candidates.length === 0) return [];
    await this.prisma.task.updateMany({ where: { ...where, id: { in: candidates.map((row) => row.id) } }, data: { lastReminderAt: now } });
    const claimed = await this.prisma.task.findMany({
      where: { id: { in: candidates.map((row) => row.id) }, lastReminderAt: now },
      select: { id: true, title: true, assigneeId: true, dueDate: true, case: { select: { caseNumber: true } } },
    });

    return claimed.map((task) => {
      const due = task.dueDate as Date;
      const overdue = due < today;
      if (overdue) summary.tasksOverdue += 1;
      else summary.tasksDueSoon += 1;
      const when = overdue ? `хугацаа ${formatDateMn(due)} өнгөрсөн` : due < tomorrow ? 'өнөөдөр дуусна' : 'маргааш дуусна';
      return {
        userId: task.assigneeId,
        type: 'TASK',
        title: overdue ? `Хугацаа хэтэрсэн даалгавар: ${task.title}` : `Даалгаврын хугацаа дөхөж байна: ${task.title}`,
        body: `${task.case?.caseNumber ?? 'Дотоод ажил'} · ${when}`,
        link: `/admin/tasks/${task.id}`,
      };
    });
  }

  /** SENT and past due → OVERDUE (once, guarded by the status), telling the lead lawyer and the client. */
  private async overdueInvoices(now: Date, today: Date, summary: ReminderSummary): Promise<CreateNotificationInput[]> {
    const where: Prisma.InvoiceWhereInput = { status: InvoiceStatus.SENT, dueDate: { lt: today } };
    const candidates = await this.prisma.invoice.findMany({ where, select: { id: true } });
    if (candidates.length === 0) return [];
    const ids = candidates.map((row) => row.id);
    await this.prisma.invoice.updateMany({ where: { ...where, id: { in: ids } }, data: { status: InvoiceStatus.OVERDUE, lastReminderAt: now } });
    const moved = await this.prisma.invoice.findMany({
      where: { id: { in: ids }, status: InvoiceStatus.OVERDUE, lastReminderAt: now },
      select: { id: true, invoiceNumber: true, amount: true, dueDate: true, case: { select: { caseNumber: true, clientId: true, lawyerId: true } } },
    });
    summary.invoicesMarkedOverdue += moved.length;
    return moved.flatMap((invoice) => {
      const amount = formatMoneyMn(String(invoice.amount));
      const due = formatDateMn(invoice.dueDate);
      return [
        {
          userId: invoice.case.lawyerId,
          type: 'INVOICE',
          title: `Нэхэмжлэхийн хугацаа хэтэрлээ: ${invoice.invoiceNumber}`,
          body: `${invoice.case.caseNumber} · ${amount} · төлөх хугацаа ${due}`,
          link: `/admin/invoices/${invoice.id}`,
        },
        {
          userId: invoice.case.clientId,
          type: 'INVOICE',
          title: 'Нэхэмжлэхийн хугацаа хэтэрсэн',
          body: `${invoice.invoiceNumber} · ${amount} · төлөх хугацаа ${due}`,
          link: `/portal/invoices/${invoice.id}`,
        },
      ];
    });
  }

  private async invoicesDueTomorrow(now: Date, today: Date, summary: ReminderSummary): Promise<CreateNotificationInput[]> {
    const where: Prisma.InvoiceWhereInput = {
      status: InvoiceStatus.SENT,
      dueDate: { gte: addDays(today, 1), lt: addDays(today, 2) },
      ...this.notRemindedToday(today),
    };
    const candidates = await this.prisma.invoice.findMany({ where, select: { id: true } });
    if (candidates.length === 0) return [];
    const ids = candidates.map((row) => row.id);
    await this.prisma.invoice.updateMany({ where: { ...where, id: { in: ids } }, data: { lastReminderAt: now } });
    const claimed = await this.prisma.invoice.findMany({
      where: { id: { in: ids }, lastReminderAt: now },
      select: { id: true, invoiceNumber: true, amount: true, dueDate: true, case: { select: { clientId: true } } },
    });
    summary.invoicesDueTomorrow += claimed.length;
    return claimed.map((invoice) => ({
      userId: invoice.case.clientId,
      type: 'INVOICE',
      title: `Нэхэмжлэхийн төлөх хугацаа маргааш: ${invoice.invoiceNumber}`,
      body: `${formatMoneyMn(String(invoice.amount))} · төлөх хугацаа ${formatDateMn(invoice.dueDate)}`,
      link: `/portal/invoices/${invoice.id}`,
    }));
  }

  private async documentRequestReminders(now: Date, today: Date, summary: ReminderSummary): Promise<CreateNotificationInput[]> {
    const where: Prisma.DocumentRequestWhereInput = { status: { in: WAITING_ON_CLIENT }, dueDate: { lt: today }, ...this.notRemindedToday(today) };
    const candidates = await this.prisma.documentRequest.findMany({ where, select: { id: true } });
    if (candidates.length === 0) return [];
    const ids = candidates.map((row) => row.id);
    await this.prisma.documentRequest.updateMany({ where: { ...where, id: { in: ids } }, data: { lastReminderAt: now } });
    const claimed = await this.prisma.documentRequest.findMany({
      where: { id: { in: ids }, lastReminderAt: now },
      select: { id: true, title: true, dueDate: true, caseId: true, case: { select: { caseNumber: true, clientId: true } } },
    });
    summary.documentRequestsOverdue += claimed.length;
    return claimed.map((request) => ({
      userId: request.case.clientId,
      type: 'DOCUMENT_REQUEST',
      title: `Баримт хүлээгдэж байна: ${request.title}`,
      body: `${request.case.caseNumber} · эцсийн хугацаа ${formatDateMn(request.dueDate as Date)} өнгөрсөн`,
      link: `/portal/cases/${request.caseId}?tab=requests`,
    }));
  }
}
