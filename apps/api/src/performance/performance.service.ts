import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  Role,
  TaskPriority,
  TaskStatus,
  type PerformanceByUser,
  type PerformanceMetrics,
  type PerformanceOverview,
  type PerformancePeriod,
  type PerformancePerson,
  type PerformanceQueryInput,
  type PerformanceRange,
  type PerformanceTimeline,
  type PerformanceTimelineQueryInput,
  type PerformanceUserDetail,
  type Prisma,
} from '@law-firm/shared';
import type { RequestUser } from '../common/types/request-user';
import { PrismaService } from '../prisma/prisma.service';
import { TasksService } from '../tasks/tasks.service';

const ACTIVE_STATUSES: TaskStatus[] = [TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.REVIEW];
const STAFF_ROLES: Role[] = [Role.LAWYER, Role.ADMIN];
const RECENT_TASKS = 8;
const MAX_MONTH_BUCKETS = 24;

const STAFF_SELECT = { id: true, firstName: true, lastName: true, avatarUrl: true, role: true } satisfies Prisma.UserSelect;
const RECENT_TASK_SELECT = {
  id: true,
  title: true,
  status: true,
  priority: true,
  dueDate: true,
  completedAt: true,
  updatedAt: true,
  case: { select: { id: true, caseNumber: true } },
} satisfies Prisma.TaskSelect;

interface Range {
  period: PerformancePeriod;
  from: Date | null;
  to: Date;
}

type CountGroup<K extends string> = Record<K, string> & { _count: { _all: number } };

interface Counts {
  active: number;
  overdue: number;
  completed: number;
  completedWithDueDate: number;
  completedOnTime: number;
}

const EMPTY_COUNTS: Counts = { active: 0, overdue: 0, completed: 0, completedWithDueDate: 0, completedOnTime: 0 };
const COUNT_KEYS: (keyof Counts)[] = ['active', 'overdue', 'completed', 'completedWithDueDate', 'completedOnTime'];

/** Period boundaries in server local time: this-month from the 1st; last-30-days is today plus the 29 days before it. */
export function periodRange(period: PerformancePeriod, now = new Date()): Range {
  if (period === 'this-month') return { period, from: new Date(now.getFullYear(), now.getMonth(), 1), to: now };
  if (period === 'last-30-days') return { period, from: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29), to: now };
  return { period, from: null, to: now };
}

/** On-time rate = completed by the due date ÷ completed tasks that had a due date, rounded; null when there were none. */
function toMetrics(counts: Counts): PerformanceMetrics {
  return {
    activeTasks: counts.active,
    completedTasks: counts.completed,
    overdueTasks: counts.overdue,
    completedWithDueDate: counts.completedWithDueDate,
    completedOnTime: counts.completedOnTime,
    onTimeRate: counts.completedWithDueDate === 0 ? null : Math.round((counts.completedOnTime / counts.completedWithDueDate) * 100),
  };
}

const pad = (n: number) => String(n).padStart(2, '0');
const dayKey = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const monthKey = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;

/**
 * Workload picture for staff, built on tasks and case teams. It reports counts, it does not score people:
 * ADMIN sees every active staff member, a LAWYER sees themselves and everyone who shares a case team with them.
 */
@Injectable()
export class PerformanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tasks: TasksService,
  ) {}

  async overview(viewer: RequestUser, query: PerformanceQueryInput): Promise<PerformanceOverview> {
    const range = periodRange(query.period);
    const people = await this.visibleStaff(viewer);
    const counts = await this.countsByUser(people.map((person) => person.id), range);
    const total = [...counts.values()].reduce(
      (sum, item) => Object.fromEntries(COUNT_KEYS.map((key) => [key, sum[key] + item[key]])) as unknown as Counts,
      { ...EMPTY_COUNTS },
    );
    return {
      ...toMetrics(total),
      range: serializeRange(range),
      scope: viewer.role === Role.ADMIN ? 'organization' : 'team',
      people: people.length,
    };
  }

  async byUser(viewer: RequestUser, query: PerformanceQueryInput): Promise<PerformanceByUser> {
    const range = periodRange(query.period);
    const people = await this.visibleStaff(viewer);
    const ids = people.map((person) => person.id);
    const [counts, caseCounts] = await Promise.all([this.countsByUser(ids, range), this.caseCounts(ids)]);
    return {
      range: serializeRange(range),
      items: people.map((person) => ({
        user: person,
        caseCount: caseCounts.get(person.id) ?? 0,
        isSelf: person.id === viewer.id,
        ...toMetrics(counts.get(person.id) ?? EMPTY_COUNTS),
      })),
    };
  }

  async userDetail(viewer: RequestUser, userId: string, query: PerformanceQueryInput): Promise<PerformanceUserDetail> {
    const range = periodRange(query.period);
    const person = await this.assertVisible(viewer, userId);
    const inRange = rangeFilter(range);

    const [counts, caseCounts, statusGroups, priorityGroups, recent] = await Promise.all([
      this.countsByUser([userId], range),
      this.caseCounts([userId]),
      this.prisma.task.groupBy({
        by: ['status'],
        where: {
          assigneeId: userId,
          OR: [
            { status: { in: ACTIVE_STATUSES } },
            { status: TaskStatus.DONE, completedAt: inRange },
            { status: TaskStatus.CANCELLED, updatedAt: inRange },
          ],
        },
        _count: { _all: true },
      }),
      this.prisma.task.groupBy({ by: ['priority'], where: { assigneeId: userId, status: { in: ACTIVE_STATUSES } }, _count: { _all: true } }),
      this.prisma.task.findMany({
        where: { AND: [{ assigneeId: userId }, this.tasks.visibleWhere(viewer)] },
        select: RECENT_TASK_SELECT,
        orderBy: { updatedAt: 'desc' },
        take: RECENT_TASKS,
      }),
    ]);

    const byStatus = Object.fromEntries(Object.values(TaskStatus).map((status) => [status, 0])) as Record<TaskStatus, number>;
    for (const group of statusGroups as CountGroup<'status'>[]) byStatus[group.status as TaskStatus] = group._count._all;
    const byPriority = Object.fromEntries(Object.values(TaskPriority).map((priority) => [priority, 0])) as Record<TaskPriority, number>;
    for (const group of priorityGroups as CountGroup<'priority'>[]) byPriority[group.priority as TaskPriority] = group._count._all;

    return {
      range: serializeRange(range),
      user: person,
      isSelf: person.id === viewer.id,
      metrics: { ...toMetrics(counts.get(userId) ?? EMPTY_COUNTS), caseCount: caseCounts.get(userId) ?? 0 },
      byStatus,
      byPriority,
      recentTasks: recent.map((task) => ({
        ...task,
        dueDate: task.dueDate?.toISOString() ?? null,
        completedAt: task.completedAt?.toISOString() ?? null,
        updatedAt: task.updatedAt.toISOString(),
      })),
    };
  }

  /** Completed tasks per day (this month, last 30 days) or per month (all time, at most the last 24 months). */
  async timeline(viewer: RequestUser, query: PerformanceTimelineQueryInput): Promise<PerformanceTimeline> {
    const range = periodRange(query.period);
    const ids = query.userId
      ? [(await this.assertVisible(viewer, query.userId)).id]
      : (await this.visibleStaff(viewer)).map((person) => person.id);
    const rows = ids.length
      ? await this.prisma.task.findMany({
          where: { assigneeId: { in: ids }, status: TaskStatus.DONE, completedAt: rangeFilter(range) },
          select: { completedAt: true },
        })
      : [];
    const dates = rows.map((row) => row.completedAt).filter((date): date is Date => date instanceof Date);

    const granularity = range.from ? 'day' : 'month';
    const buckets = granularity === 'day' ? dayBuckets(range.from as Date, range.to) : monthBuckets(dates, range.to);
    const index = new Map(buckets.map((bucket, i) => [bucket.key, i]));
    for (const date of dates) {
      const i = index.get(granularity === 'day' ? dayKey(date) : monthKey(date));
      if (i !== undefined) buckets[i].completed += 1;
    }
    return { range: serializeRange(range), granularity, userId: query.userId ?? null, buckets };
  }

  /** ADMIN: all active lawyers and admins. LAWYER: themselves plus everyone on any case team they belong to. */
  async visibleStaff(viewer: RequestUser): Promise<PerformancePerson[]> {
    const where: Prisma.UserWhereInput = { role: { in: STAFF_ROLES }, isActive: true };
    if (viewer.role === Role.LAWYER) {
      const teammates = await this.prisma.caseMember.findMany({
        where: { case: { members: { some: { userId: viewer.id } } } },
        select: { userId: true },
        distinct: ['userId'],
      });
      where.id = { in: [...new Set([viewer.id, ...teammates.map((member) => member.userId)])] };
    } else if (viewer.role !== Role.ADMIN) {
      throw new ForbiddenException('Гүйцэтгэлийн мэдээлэл зөвхөн ажилтанд харагдана');
    }
    const people = await this.prisma.user.findMany({ where, select: STAFF_SELECT, orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }] });
    return people as PerformancePerson[];
  }

  // ─── helpers ───────────────────────────────────────────────────────────────

  /** A LAWYER gets 403 for anyone outside their teams (existing or not); ADMIN gets 404 for someone who is not active staff. */
  private async assertVisible(viewer: RequestUser, userId: string): Promise<PerformancePerson> {
    const person = (await this.visibleStaff(viewer)).find((item) => item.id === userId);
    if (person) return person;
    if (viewer.role === Role.ADMIN) throw new NotFoundException('Ажилтан олдсонгүй');
    throw new ForbiddenException('Энэ ажилтны гүйцэтгэлийг харах эрх танд байхгүй байна');
  }

  /** Five grouped queries for any number of people: active, overdue, completed, completed with a due date, completed on time. */
  private async countsByUser(userIds: string[], range: Range): Promise<Map<string, Counts>> {
    const result = new Map(userIds.map((id) => [id, { ...EMPTY_COUNTS }]));
    if (userIds.length === 0) return result;
    const now = new Date();
    const assigned: Prisma.TaskWhereInput = { assigneeId: { in: userIds } };
    const completed: Prisma.TaskWhereInput = { ...assigned, status: TaskStatus.DONE, completedAt: rangeFilter(range) };
    const completedWithDue: Prisma.TaskWhereInput = { ...completed, dueDate: { not: null } };

    const groups = await Promise.all(
      [
        { ...assigned, status: { in: ACTIVE_STATUSES } },
        { ...assigned, status: { in: ACTIVE_STATUSES }, dueDate: { lt: now } },
        completed,
        completedWithDue,
        { AND: [completedWithDue, { completedAt: { lte: this.prisma.task.fields.dueDate } }] },
      ].map((where) => this.prisma.task.groupBy({ by: ['assigneeId'], where, _count: { _all: true } })),
    );
    groups.forEach((rows, i) => {
      for (const row of rows) {
        const counts = result.get(row.assigneeId);
        if (counts) counts[COUNT_KEYS[i]] = row._count._all;
      }
    });
    return result;
  }

  private async caseCounts(userIds: string[]): Promise<Map<string, number>> {
    if (userIds.length === 0) return new Map();
    const groups = await this.prisma.caseMember.groupBy({ by: ['userId'], where: { userId: { in: userIds } }, _count: { _all: true } });
    return new Map(groups.map((group) => [group.userId, group._count._all]));
  }
}

/** Works for both nullable (completedAt) and required (updatedAt) date columns. */
function rangeFilter(range: Range): { gte?: Date; lte: Date } {
  return range.from ? { gte: range.from, lte: range.to } : { lte: range.to };
}

function serializeRange(range: Range): PerformanceRange {
  return { period: range.period, from: range.from?.toISOString() ?? null, to: range.to.toISOString() };
}

function dayBuckets(from: Date, to: Date): PerformanceTimeline['buckets'] {
  const buckets: PerformanceTimeline['buckets'] = [];
  for (let day = new Date(from.getFullYear(), from.getMonth(), from.getDate()); day <= to; day = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1)) {
    buckets.push({ key: dayKey(day), label: `${pad(day.getMonth() + 1)}.${pad(day.getDate())}`, completed: 0 });
  }
  return buckets;
}

function monthBuckets(dates: Date[], to: Date): PerformanceTimeline['buckets'] {
  const earliest = dates.reduce((min, date) => (date < min ? date : min), to);
  const oldestAllowed = new Date(to.getFullYear(), to.getMonth() - (MAX_MONTH_BUCKETS - 1), 1);
  let month = new Date(earliest.getFullYear(), earliest.getMonth(), 1);
  if (month < oldestAllowed) month = oldestAllowed;
  const buckets: PerformanceTimeline['buckets'] = [];
  for (; month <= to; month = new Date(month.getFullYear(), month.getMonth() + 1, 1)) {
    buckets.push({ key: monthKey(month), label: `${month.getFullYear()}.${pad(month.getMonth() + 1)}`, completed: 0 });
  }
  return buckets;
}
