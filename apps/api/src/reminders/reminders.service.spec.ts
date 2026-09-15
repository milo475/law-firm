import { SchedulerRegistry } from '@nestjs/schedule';
import { createConfigMock } from '../common/testing/mocks';
import type { NotificationsService } from '../notifications/notifications.service';
import type { PrismaService } from '../prisma/prisma.service';
import { DAILY_REMINDERS_JOB, RemindersScheduler } from './reminders.scheduler';
import { RemindersService } from './reminders.service';

/* In-memory rows + the subset of Prisma filters the reminder job uses, so each run changes state like the database would. */
type Row = Record<string, any>;
const same = (a: unknown, b: unknown) => (a instanceof Date && b instanceof Date ? a.getTime() === b.getTime() : a === b);

function matches(row: Row, where: Row = {}): boolean {
  return Object.entries(where).every(([key, cond]) => {
    if (key === 'OR') return (cond as Row[]).some((part) => matches(row, part));
    const value = row[key];
    if (cond === null || typeof cond !== 'object' || cond instanceof Date) return same(value ?? null, cond);
    return Object.entries(cond).every(([op, arg]) => {
      if (op === 'in') return (arg as unknown[]).includes(value);
      if (value == null) return false;
      if (op === 'lt') return +value < +(arg as Date);
      if (op === 'gte') return +value >= +(arg as Date);
      throw new Error(`unsupported operator ${op}`);
    });
  });
}

const d = (month: number, day: number, hour = 12, minute = 0) => new Date(2026, month - 1, day, hour, minute);
const NOW = d(9, 15, 8);

function createDb() {
  const cases: Row = { 'case-1': { caseNumber: 'LF-2026-0001', clientId: 'client-id', lawyerId: 'lead-id' } };
  const tasks: Row[] = [
    { id: 'a1', title: 'Нэхэмжлэлийн төсөл', assigneeId: 'lawyer-a', status: 'TODO', dueDate: d(9, 10), caseId: 'case-1' },
    { id: 'a2', title: 'Шүүхэд бичиг өгөх', assigneeId: 'lawyer-a', status: 'IN_PROGRESS', dueDate: d(9, 15, 18), caseId: null },
    { id: 'a3', title: 'Гэрчтэй уулзах', assigneeId: 'lawyer-b', status: 'REVIEW', dueDate: d(9, 16, 23, 59), caseId: 'case-1' },
    { id: 'a4', title: 'Ирээдүйн ажил', assigneeId: 'lawyer-a', status: 'TODO', dueDate: d(9, 20), caseId: null },
    { id: 'a5', title: 'Дууссан', assigneeId: 'lawyer-a', status: 'DONE', dueDate: d(9, 1), caseId: null },
    { id: 'a6', title: 'Цуцалсан', assigneeId: 'lawyer-a', status: 'CANCELLED', dueDate: d(9, 1), caseId: null },
    { id: 'a7', title: 'Хугацаагүй', assigneeId: 'lawyer-a', status: 'TODO', dueDate: null, caseId: null },
    { id: 'a8', title: 'Өнөөдөр сануулсан', assigneeId: 'lawyer-a', status: 'TODO', dueDate: d(9, 12), caseId: null, lastReminderAt: d(9, 15, 7) },
    { id: 'a9', title: 'Өчигдөр сануулсан', assigneeId: 'lawyer-b', status: 'TODO', dueDate: d(9, 12), caseId: null, lastReminderAt: d(9, 14, 8) },
  ];
  const invoices: Row[] = [
    { id: 'i1', invoiceNumber: 'INV-2026-0001', amount: '800000.00', status: 'SENT', dueDate: d(9, 14, 23, 59), caseId: 'case-1' },
    { id: 'i2', invoiceNumber: 'INV-2026-0002', amount: '300000.00', status: 'SENT', dueDate: d(9, 16, 23, 59), caseId: 'case-1' },
    { id: 'i3', invoiceNumber: 'INV-2026-0003', amount: '100000.00', status: 'SENT', dueDate: d(9, 25), caseId: 'case-1' },
    { id: 'i4', invoiceNumber: 'INV-2026-0004', amount: '100000.00', status: 'AWAITING_CONFIRMATION', dueDate: d(9, 1), caseId: 'case-1' },
    { id: 'i5', invoiceNumber: 'INV-2026-0005', amount: '100000.00', status: 'OVERDUE', dueDate: d(9, 1), caseId: 'case-1' },
    { id: 'i6', invoiceNumber: 'INV-2026-0006', amount: '100000.00', status: 'PAID', dueDate: d(9, 1), caseId: 'case-1' },
  ];
  const requests: Row[] = [
    { id: 'r1', title: 'Иргэний үнэмлэх', status: 'PENDING', dueDate: d(9, 10), caseId: 'case-1' },
    { id: 'r2', title: 'Банкны хуулга', status: 'REJECTED', dueDate: d(9, 14), caseId: 'case-1' },
    { id: 'r3', title: 'Илгээсэн баримт', status: 'SUBMITTED', dueDate: d(9, 10), caseId: 'case-1' },
    { id: 'r4', title: 'Ирээдүйн баримт', status: 'PENDING', dueDate: d(9, 20), caseId: 'case-1' },
    { id: 'r5', title: 'Хугацаагүй баримт', status: 'PENDING', dueDate: null, caseId: 'case-1' },
  ];

  const pick = (row: Row, select: Row) =>
    Object.fromEntries(
      Object.keys(select).map((key) => {
        if (key !== 'case') return [key, row[key]];
        const ref = row.caseId ? cases[row.caseId] : null;
        return [key, ref ? Object.fromEntries(Object.keys(select.case.select).map((field) => [field, ref[field]])) : null];
      }),
    );
  const delegate = (rows: Row[]) => ({
    findMany: jest.fn(async ({ where, select }: Row) => rows.filter((row) => matches(row, where)).map((row) => pick(row, select))),
    updateMany: jest.fn(async ({ where, data }: Row) => {
      const hit = rows.filter((row) => matches(row, where));
      for (const row of hit) Object.assign(row, data);
      return { count: hit.length };
    }),
  });
  return { rows: { tasks, invoices, requests }, prisma: { task: delegate(tasks), invoice: delegate(invoices), documentRequest: delegate(requests) } };
}

describe('RemindersService.runDaily', () => {
  let db: ReturnType<typeof createDb>;
  let notifications: { createMany: jest.Mock };
  let service: RemindersService;
  const sent = () => notifications.createMany.mock.calls.flatMap(([inputs]) => inputs);

  beforeEach(() => {
    db = createDb();
    notifications = { createMany: jest.fn().mockResolvedValue({ count: 1 }) };
    service = new RemindersService(db.prisma as unknown as PrismaService, notifications as unknown as NotificationsService);
  });

  it('an overdue active task notifies its assignee with a link to the task', async () => {
    await service.runDaily(NOW);
    expect(sent()).toContainEqual({
      userId: 'lawyer-a',
      type: 'TASK',
      title: 'Хугацаа хэтэрсэн даалгавар: Нэхэмжлэлийн төсөл',
      body: 'LF-2026-0001 · хугацаа 2026.09.10 өнгөрсөн',
      link: '/admin/tasks/a1',
    });
  });

  it('tasks due today or tomorrow get the "due soon" reminder; later, finished, cancelled and undated tasks get nothing', async () => {
    await service.runDaily(NOW);
    const taskTitles = sent().filter((item: Row) => item.type === 'TASK').map((item: Row) => item.title);
    expect(taskTitles).toEqual(expect.arrayContaining(['Даалгаврын хугацаа дөхөж байна: Шүүхэд бичиг өгөх', 'Даалгаврын хугацаа дөхөж байна: Гэрчтэй уулзах']));
    expect(sent()).toContainEqual(expect.objectContaining({ userId: 'lawyer-a', body: 'Дотоод ажил · өнөөдөр дуусна' }));
    expect(sent()).toContainEqual(expect.objectContaining({ userId: 'lawyer-b', body: 'LF-2026-0001 · маргааш дуусна' }));
    for (const title of ['Ирээдүйн ажил', 'Дууссан', 'Цуцалсан', 'Хугацаагүй']) expect(taskTitles.join('|')).not.toContain(title);
  });

  it('an item already reminded today is skipped; one reminded yesterday is reminded again', async () => {
    await service.runDaily(NOW);
    const taskTitles = sent().map((item: Row) => item.title);
    expect(taskTitles).not.toContain('Хугацаа хэтэрсэн даалгавар: Өнөөдөр сануулсан');
    expect(taskTitles).toContain('Хугацаа хэтэрсэн даалгавар: Өчигдөр сануулсан');
  });

  it('running twice on the same day creates no second batch of notifications', async () => {
    const first = await service.runDaily(NOW);
    expect(first.notifications).toBeGreaterThan(0);
    notifications.createMany.mockClear();
    const second = await service.runDaily(d(9, 15, 17));
    expect(second).toEqual({ tasksOverdue: 0, tasksDueSoon: 0, invoicesMarkedOverdue: 0, invoicesDueTomorrow: 0, documentRequestsOverdue: 0, notifications: 0 });
    expect(notifications.createMany).not.toHaveBeenCalled();
    expect(db.rows.tasks.find((row) => row.id === 'a1')?.lastReminderAt).toEqual(NOW);
  });

  it('the next day an overdue task is reminded again and tomorrow’s task becomes due today', async () => {
    await service.runDaily(NOW);
    notifications.createMany.mockClear();
    await service.runDaily(d(9, 16, 8));
    const titles = sent().map((item: Row) => item.title);
    expect(titles).toContain('Хугацаа хэтэрсэн даалгавар: Нэхэмжлэлийн төсөл');
    expect(sent()).toContainEqual(expect.objectContaining({ title: 'Даалгаврын хугацаа дөхөж байна: Гэрчтэй уулзах', body: 'LF-2026-0001 · өнөөдөр дуусна' }));
    expect(titles).toContain('Хугацаа хэтэрсэн даалгавар: Шүүхэд бичиг өгөх');
  });

  it('an overdue SENT invoice becomes OVERDUE once and notifies the lead lawyer and the client', async () => {
    await service.runDaily(NOW);
    expect(db.rows.invoices.find((row) => row.id === 'i1')?.status).toBe('OVERDUE');
    expect(sent()).toEqual(
      expect.arrayContaining([
        { userId: 'lead-id', type: 'INVOICE', title: 'Нэхэмжлэхийн хугацаа хэтэрлээ: INV-2026-0001', body: 'LF-2026-0001 · 800 000₮ · төлөх хугацаа 2026.09.14', link: '/admin/invoices/i1' },
        { userId: 'client-id', type: 'INVOICE', title: 'Нэхэмжлэхийн хугацаа хэтэрсэн', body: 'INV-2026-0001 · 800 000₮ · төлөх хугацаа 2026.09.14', link: '/portal/invoices/i1' },
      ]),
    );
    expect(db.rows.invoices.find((row) => row.id === 'i4')?.status).toBe('AWAITING_CONFIRMATION');
    expect(sent().filter((item: Row) => /INV-2026-000[456]/.test(`${item.title} ${item.body}`))).toEqual([]);

    notifications.createMany.mockClear();
    await expect(service.runDaily(d(9, 16, 8))).resolves.toMatchObject({ invoicesMarkedOverdue: 0 });
    expect(sent().filter((item: Row) => item.link === '/portal/invoices/i1' || item.link === '/admin/invoices/i1')).toEqual([]);
  });

  it('an invoice due tomorrow reminds only the client and stays SENT; later invoices get nothing', async () => {
    const summary = await service.runDaily(NOW);
    expect(summary.invoicesDueTomorrow).toBe(1);
    expect(sent()).toContainEqual({ userId: 'client-id', type: 'INVOICE', title: 'Нэхэмжлэхийн төлөх хугацаа маргааш: INV-2026-0002', body: '300 000₮ · төлөх хугацаа 2026.09.16', link: '/portal/invoices/i2' });
    expect(db.rows.invoices.find((row) => row.id === 'i2')?.status).toBe('SENT');
    expect(sent().some((item: Row) => item.link === '/portal/invoices/i3')).toBe(false);
  });

  it('overdue PENDING and REJECTED document requests remind the client; submitted, future and undated ones do not', async () => {
    const summary = await service.runDaily(NOW);
    expect(summary.documentRequestsOverdue).toBe(2);
    const requestTitles = sent().filter((item: Row) => item.type === 'DOCUMENT_REQUEST').map((item: Row) => item.title);
    expect(requestTitles.sort()).toEqual(['Баримт хүлээгдэж байна: Банкны хуулга', 'Баримт хүлээгдэж байна: Иргэний үнэмлэх']);
    expect(sent()).toContainEqual(expect.objectContaining({ userId: 'client-id', link: '/portal/cases/case-1?tab=requests', body: 'LF-2026-0001 · эцсийн хугацаа 2026.09.10 өнгөрсөн' }));
  });

  it('returns a summary of what was sent', async () => {
    await expect(service.runDaily(NOW)).resolves.toEqual({
      tasksOverdue: 2,
      tasksDueSoon: 2,
      invoicesMarkedOverdue: 1,
      invoicesDueTomorrow: 1,
      documentRequestsOverdue: 2,
      notifications: 9,
    });
  });

  it('nothing due → no notification insert at all', async () => {
    const empty = { findMany: jest.fn().mockResolvedValue([]), updateMany: jest.fn() };
    const quiet = new RemindersService({ task: empty, invoice: empty, documentRequest: empty } as unknown as PrismaService, notifications as unknown as NotificationsService);
    await expect(quiet.runDaily(NOW)).resolves.toMatchObject({ notifications: 0 });
    expect(notifications.createMany).not.toHaveBeenCalled();
    expect(empty.updateMany).not.toHaveBeenCalled();
  });
});

describe('RemindersScheduler', () => {
  const reminders = { runDaily: jest.fn() } as unknown as RemindersService;

  it('is never scheduled under NODE_ENV=test or with REMINDERS_ENABLED=false', () => {
    for (const overrides of [{ NODE_ENV: 'test' as const, REMINDERS_ENABLED: true }, { NODE_ENV: 'development' as const, REMINDERS_ENABLED: false }]) {
      const registry = new SchedulerRegistry();
      new RemindersScheduler(createConfigMock(overrides), registry, reminders).onApplicationBootstrap();
      expect(registry.doesExist('cron', DAILY_REMINDERS_JOB)).toBe(false);
    }
  });

  it('registers the daily job with the configured cron expression when enabled', () => {
    const registry = new SchedulerRegistry();
    new RemindersScheduler(createConfigMock({ NODE_ENV: 'production', REMINDERS_ENABLED: true, REMINDERS_CRON: '0 30 7 * * *' }), registry, reminders).onApplicationBootstrap();
    const job = registry.getCronJob(DAILY_REMINDERS_JOB);
    expect(job.isActive).toBe(true);
    const next = job.nextDate().toJSDate();
    expect([next.getHours(), next.getMinutes()]).toEqual([7, 30]);
    job.stop();
    expect(reminders.runDaily).not.toHaveBeenCalled();
  });
});
