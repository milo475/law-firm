import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ADMIN_USER, LAWYER_USER, OTHER_LAWYER } from '../common/testing/mocks';
import type { RequestUser } from '../common/types/request-user';
import type { PrismaService } from '../prisma/prisma.service';
import { TasksService } from '../tasks/tasks.service';
import { PerformanceService, periodRange } from './performance.service';

/*
 * A small in-memory stand-in for the Prisma calls the service makes (where / groupBy / select / orderBy / take),
 * so the tests check the numbers the definitions promise rather than the shape of the queries.
 */
type Row = Record<string, any>;
const FIELD = Symbol('field');
const same = (a: unknown, b: unknown) => (a instanceof Date && b instanceof Date ? a.getTime() === b.getTime() : a === b);

const MEMBER: RequestUser = { id: 'member-lawyer-id', email: 'member@lawfirm.mn', role: 'LAWYER' };
const NOW = new Date(2026, 8, 15, 12, 0, 0);
const d = (month: number, day: number, hour = 12) => new Date(2026, month - 1, day, hour);

const STAFF: Row[] = [
  { id: ADMIN_USER.id, firstName: 'Батболд', lastName: 'Дорж', avatarUrl: null, role: 'ADMIN', isActive: true },
  { id: LAWYER_USER.id, firstName: 'Энхжаргал', lastName: 'Бат', avatarUrl: null, role: 'LAWYER', isActive: true },
  { id: MEMBER.id, firstName: 'Сараа', lastName: 'Ганбаатар', avatarUrl: null, role: 'LAWYER', isActive: true },
  { id: OTHER_LAWYER.id, firstName: 'Оюунбилэг', lastName: 'Цэнд', avatarUrl: null, role: 'LAWYER', isActive: true },
  { id: 'client-id', firstName: 'Ганбат', lastName: 'Сүх', avatarUrl: null, role: 'CLIENT', isActive: true },
  { id: 'retired-id', firstName: 'Тэмүүлэн', lastName: 'Өлзий', avatarUrl: null, role: 'LAWYER', isActive: false },
];
const MEMBERSHIPS: Row[] = [
  { caseId: 'case-1', userId: LAWYER_USER.id },
  { caseId: 'case-1', userId: MEMBER.id },
  { caseId: 'case-2', userId: OTHER_LAWYER.id },
  { caseId: 'case-3', userId: OTHER_LAWYER.id },
  { caseId: 'case-3', userId: ADMIN_USER.id },
];
const task = (id: string, assigneeId: string, status: string, extra: Row = {}): Row => ({
  id,
  title: `Даалгавар ${id}`,
  assigneeId,
  createdById: assigneeId,
  caseId: 'case-1',
  status,
  priority: 'MEDIUM',
  dueDate: null,
  completedAt: null,
  updatedAt: d(9, 1),
  ...extra,
});
const TASKS: Row[] = [
  task('t1', LAWYER_USER.id, 'TODO', { dueDate: d(9, 10), priority: 'HIGH' }),
  task('t2', LAWYER_USER.id, 'IN_PROGRESS', { dueDate: d(9, 20), priority: 'URGENT' }),
  task('t3', LAWYER_USER.id, 'REVIEW', { priority: 'LOW' }),
  task('t4', LAWYER_USER.id, 'DONE', { dueDate: d(9, 6), completedAt: d(9, 5) }),
  task('t5', LAWYER_USER.id, 'DONE', { dueDate: d(9, 10), completedAt: d(9, 12) }),
  task('t6', LAWYER_USER.id, 'DONE', { completedAt: d(9, 8) }),
  task('t7', LAWYER_USER.id, 'DONE', { dueDate: d(8, 25), completedAt: d(8, 20) }),
  task('t8', LAWYER_USER.id, 'DONE', { dueDate: d(5, 30), completedAt: d(6, 1) }),
  task('t9', LAWYER_USER.id, 'CANCELLED', { dueDate: d(9, 1), updatedAt: d(9, 3) }),
  task('m1', MEMBER.id, 'DONE', { completedAt: d(9, 14) }),
  task('m2', MEMBER.id, 'IN_PROGRESS', { dueDate: d(9, 1) }),
  task('m3', MEMBER.id, 'TODO', { caseId: 'case-2', createdById: OTHER_LAWYER.id, title: 'Өөр хэргийн даалгавар' }),
  task('o1', OTHER_LAWYER.id, 'DONE', { dueDate: d(9, 2, 23), completedAt: d(9, 2, 18) }),
  task('o2', OTHER_LAWYER.id, 'TODO', { caseId: null, title: 'Хувийн дотоод ажил' }),
];

function matchValue(row: Row, key: string, cond: any): boolean {
  const value = row[key];
  if (cond === null || typeof cond !== 'object' || cond instanceof Date) return same(value, cond);
  return Object.entries(cond).every(([op, raw]) => {
    const arg = raw && typeof raw === 'object' && FIELD in (raw as object) ? row[(raw as any)[FIELD]] : raw;
    switch (op) {
      case 'in':
        return (arg as unknown[]).includes(value);
      case 'not':
        return arg === null ? value !== null && value !== undefined : !same(value, arg);
      case 'lt':
        return value != null && arg != null && +value < +(arg as Date);
      case 'lte':
        return value != null && arg != null && +value <= +(arg as Date);
      case 'gte':
        return value != null && arg != null && +value >= +(arg as Date);
      default:
        throw new Error(`fake prisma: unsupported operator ${op}`);
    }
  });
}

function matches(row: Row, where: Row = {}): boolean {
  return Object.entries(where).every(([key, cond]) => {
    if (key === 'AND') return (cond as Row[]).every((part) => matches(row, part));
    if (key === 'OR') return (cond as Row[]).some((part) => matches(row, part));
    if (key === 'case') return MEMBERSHIPS.some((m) => m.caseId === row.caseId && m.userId === cond.members.some.userId);
    return matchValue(row, key, cond);
  });
}

function pick(row: Row, select?: Row): Row {
  if (!select) return row;
  return Object.fromEntries(
    Object.keys(select).map((key) => [key, key === 'case' ? (row.caseId ? { id: row.caseId, caseNumber: `LF-${row.caseId}` } : null) : row[key]]),
  );
}

function groupBy(rows: Row[], { by, where }: Row) {
  const counts = new Map<string, number>();
  for (const row of rows.filter((item) => matches(item, where))) counts.set(row[by[0]], (counts.get(row[by[0]]) ?? 0) + 1);
  return [...counts].map(([value, count]) => ({ [by[0]]: value, _count: { _all: count } }));
}

function createFakePrisma() {
  return {
    user: {
      findMany: jest.fn(async ({ where, select }: Row) =>
        STAFF.filter((row) => matches(row, where))
          .sort((a, b) => a.lastName.localeCompare(b.lastName))
          .map((row) => pick(row, select)),
      ),
    },
    caseMember: {
      findMany: jest.fn(async ({ where }: Row) => {
        const caseIds = new Set(MEMBERSHIPS.filter((m) => m.userId === where.case.members.some.userId).map((m) => m.caseId));
        return [...new Set(MEMBERSHIPS.filter((m) => caseIds.has(m.caseId)).map((m) => m.userId))].map((userId) => ({ userId }));
      }),
      groupBy: jest.fn(async (args: Row) => groupBy(MEMBERSHIPS, args)),
    },
    task: {
      fields: { dueDate: { [FIELD]: 'dueDate' } },
      groupBy: jest.fn(async (args: Row) => groupBy(TASKS, args)),
      findMany: jest.fn(async ({ where, select, orderBy, take }: Row) => {
        let rows = TASKS.filter((row) => matches(row, where));
        if (orderBy) {
          const [key, direction] = Object.entries(orderBy)[0] as [string, string];
          rows = [...rows].sort((a, b) => (+a[key] - +b[key]) * (direction === 'desc' ? -1 : 1));
        }
        return rows.slice(0, take ?? rows.length).map((row) => pick(row, select));
      }),
    },
  };
}

describe('PerformanceService', () => {
  let prisma: ReturnType<typeof createFakePrisma>;
  let service: PerformanceService;

  beforeEach(() => {
    jest.useFakeTimers({ now: NOW, doNotFake: ['nextTick', 'queueMicrotask', 'setImmediate', 'setTimeout', 'setInterval'] });
    prisma = createFakePrisma();
    const tasks = new TasksService(prisma as unknown as PrismaService, {} as never, {} as never);
    service = new PerformanceService(prisma as unknown as PrismaService, tasks);
  });

  afterEach(() => jest.useRealTimers());

  const row = async (viewer: RequestUser, userId: string, period: 'this-month' | 'last-30-days' | 'all-time' = 'this-month') =>
    (await service.byUser(viewer, { period })).items.find((item) => item.user.id === userId);

  describe('scope', () => {
    it('ADMIN sees every active lawyer and admin, but not clients or deactivated staff', async () => {
      const { items } = await service.byUser(ADMIN_USER, { period: 'this-month' });
      expect(items.map((item) => item.user.id).sort()).toEqual([ADMIN_USER.id, LAWYER_USER.id, MEMBER.id, OTHER_LAWYER.id].sort());
      expect(items.find((item) => item.isSelf)?.user.id).toBe(ADMIN_USER.id);
    });

    it('a LAWYER sees themselves and their case teammates only', async () => {
      const lawyer = await service.byUser(LAWYER_USER, { period: 'this-month' });
      expect(lawyer.items.map((item) => item.user.id).sort()).toEqual([LAWYER_USER.id, MEMBER.id].sort());
      const other = await service.byUser(OTHER_LAWYER, { period: 'this-month' });
      expect(other.items.map((item) => item.user.id).sort()).toEqual([ADMIN_USER.id, OTHER_LAWYER.id].sort());
    });

    it('a LAWYER opening someone outside their teams gets 403 (also for unknown ids); ADMIN gets 404 for non-staff', async () => {
      await expect(service.userDetail(LAWYER_USER, OTHER_LAWYER.id, { period: 'this-month' })).rejects.toBeInstanceOf(ForbiddenException);
      await expect(service.userDetail(LAWYER_USER, 'no-such-user', { period: 'this-month' })).rejects.toBeInstanceOf(ForbiddenException);
      await expect(service.userDetail(ADMIN_USER, 'client-id', { period: 'this-month' })).rejects.toBeInstanceOf(NotFoundException);
      await expect(service.userDetail(ADMIN_USER, 'retired-id', { period: 'this-month' })).rejects.toBeInstanceOf(NotFoundException);
      await expect(service.userDetail(LAWYER_USER, MEMBER.id, { period: 'this-month' })).resolves.toMatchObject({ user: { id: MEMBER.id }, isSelf: false });
    });

    it('a CLIENT reaching the service directly is refused', async () => {
      await expect(service.overview({ id: 'client-id', email: 'c@x.mn', role: 'CLIENT' }, { period: 'this-month' })).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('definitions', () => {
    it('period: this-month leaves out last month; last-30-days and all-time reach further back', async () => {
      expect(await row(LAWYER_USER, LAWYER_USER.id, 'this-month')).toMatchObject({ completedTasks: 3 });
      expect(await row(LAWYER_USER, LAWYER_USER.id, 'last-30-days')).toMatchObject({ completedTasks: 4 });
      expect(await row(LAWYER_USER, LAWYER_USER.id, 'all-time')).toMatchObject({ completedTasks: 5 });
      expect(periodRange('last-30-days', NOW).from).toEqual(new Date(2026, 7, 17));
      expect(periodRange('this-month', NOW).from).toEqual(new Date(2026, 8, 1));
    });

    it('on-time rate counts only completed tasks with a due date, finished on or before it', async () => {
      expect(await row(LAWYER_USER, LAWYER_USER.id, 'this-month')).toMatchObject({ completedWithDueDate: 2, completedOnTime: 1, onTimeRate: 50 });
      expect(await row(LAWYER_USER, LAWYER_USER.id, 'last-30-days')).toMatchObject({ completedWithDueDate: 3, completedOnTime: 2, onTimeRate: 67 });
      expect(await row(ADMIN_USER, OTHER_LAWYER.id)).toMatchObject({ completedOnTime: 1, onTimeRate: 100 });
    });

    it('with no due-dated completions the rate is null, not 0', async () => {
      expect(await row(LAWYER_USER, MEMBER.id)).toMatchObject({ completedTasks: 1, completedWithDueDate: 0, onTimeRate: null });
      expect(await row(ADMIN_USER, ADMIN_USER.id)).toMatchObject({ activeTasks: 0, completedTasks: 0, onTimeRate: null });
    });

    it('overdue = active and past due; finished or cancelled tasks with an old due date are not overdue', async () => {
      expect(await row(LAWYER_USER, LAWYER_USER.id)).toMatchObject({ activeTasks: 3, overdueTasks: 1 });
      expect(await row(LAWYER_USER, MEMBER.id)).toMatchObject({ activeTasks: 2, overdueTasks: 1 });
    });

    it('CANCELLED is never counted as completed', async () => {
      const detail = await service.userDetail(LAWYER_USER, LAWYER_USER.id, { period: 'this-month' });
      expect(detail.metrics.completedTasks).toBe(3);
      expect(detail.byStatus.CANCELLED).toBe(1);
      expect(detail.byStatus.DONE).toBe(3);
    });
  });

  describe('overview', () => {
    it('a LAWYER gets the combined numbers of themselves and their teammates', async () => {
      await expect(service.overview(LAWYER_USER, { period: 'this-month' })).resolves.toMatchObject({
        scope: 'team',
        people: 2,
        activeTasks: 5,
        overdueTasks: 2,
        completedTasks: 4,
        completedWithDueDate: 2,
        completedOnTime: 1,
        onTimeRate: 50,
      });
    });

    it('ADMIN gets the whole organization', async () => {
      await expect(service.overview(ADMIN_USER, { period: 'this-month' })).resolves.toMatchObject({
        scope: 'organization',
        people: 4,
        activeTasks: 6,
        overdueTasks: 2,
        completedTasks: 5,
        onTimeRate: 67,
        range: { period: 'this-month', from: new Date(2026, 8, 1).toISOString() },
      });
    });

    it('uses a fixed number of grouped queries whatever the number of people (no N+1)', async () => {
      await service.byUser(ADMIN_USER, { period: 'all-time' });
      expect(prisma.task.groupBy).toHaveBeenCalledTimes(5);
      expect(prisma.caseMember.groupBy).toHaveBeenCalledTimes(1);
      expect(prisma.user.findMany).toHaveBeenCalledTimes(1);
      expect((await row(ADMIN_USER, LAWYER_USER.id))?.caseCount).toBe(1);
    });
  });

  describe('user detail', () => {
    it('breaks the workload down by status and by the priority of active tasks', async () => {
      const detail = await service.userDetail(LAWYER_USER, LAWYER_USER.id, { period: 'this-month' });
      expect(detail.byStatus).toEqual({ TODO: 1, IN_PROGRESS: 1, REVIEW: 1, DONE: 3, CANCELLED: 1 });
      expect(detail.byPriority).toEqual({ LOW: 1, MEDIUM: 0, HIGH: 1, URGENT: 1 });
      expect(detail.metrics).toMatchObject({ caseCount: 1, onTimeRate: 50 });
      expect(detail.isSelf).toBe(true);
    });

    it('recent tasks only list what the viewer may open, while the counts still include every task', async () => {
      const member = await service.userDetail(LAWYER_USER, MEMBER.id, { period: 'this-month' });
      expect(member.metrics.activeTasks).toBe(2);
      expect(member.recentTasks.map((item) => item.id).sort()).toEqual(['m1', 'm2']);
      const other = await service.userDetail(ADMIN_USER, OTHER_LAWYER.id, { period: 'this-month' });
      expect(other.recentTasks.map((item) => item.title)).toContain('Хувийн дотоод ажил');
    });
  });

  describe('timeline', () => {
    it('this-month groups completions per day from the 1st to today', async () => {
      const timeline = await service.timeline(LAWYER_USER, { period: 'this-month' });
      expect(timeline.granularity).toBe('day');
      expect(timeline.buckets).toHaveLength(15);
      expect(timeline.buckets[0]).toEqual({ key: '2026-09-01', label: '09.01', completed: 0 });
      const nonZero = Object.fromEntries(timeline.buckets.filter((bucket) => bucket.completed > 0).map((bucket) => [bucket.key, bucket.completed]));
      expect(nonZero).toEqual({ '2026-09-05': 1, '2026-09-08': 1, '2026-09-12': 1, '2026-09-14': 1 });
    });

    it('last-30-days has 30 daily buckets; all-time groups per month from the first completion', async () => {
      const days = await service.timeline(LAWYER_USER, { period: 'last-30-days', userId: LAWYER_USER.id });
      expect(days.buckets).toHaveLength(30);
      expect(days.buckets[0].key).toBe('2026-08-17');
      expect(days.buckets.reduce((sum, bucket) => sum + bucket.completed, 0)).toBe(4);

      const months = await service.timeline(LAWYER_USER, { period: 'all-time', userId: LAWYER_USER.id });
      expect(months.granularity).toBe('month');
      expect(months.buckets.map((bucket) => [bucket.key, bucket.completed])).toEqual([
        ['2026-06', 1],
        ['2026-07', 0],
        ['2026-08', 1],
        ['2026-09', 3],
      ]);
    });

    it('userId narrows to a teammate; someone outside the teams → 403', async () => {
      const member = await service.timeline(LAWYER_USER, { period: 'this-month', userId: MEMBER.id });
      expect(member.userId).toBe(MEMBER.id);
      expect(member.buckets.reduce((sum, bucket) => sum + bucket.completed, 0)).toBe(1);
      await expect(service.timeline(LAWYER_USER, { period: 'this-month', userId: OTHER_LAWYER.id })).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});
