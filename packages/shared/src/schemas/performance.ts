import { z } from 'zod';
import type { TaskPriority, TaskStatus } from '../generated/prisma/enums.js';

export const PERFORMANCE_PERIODS = ['this-month', 'last-30-days', 'all-time'] as const;
export type PerformancePeriod = (typeof PERFORMANCE_PERIODS)[number];

const PeriodSchema = z
  .enum(PERFORMANCE_PERIODS, { message: 'Хугацааны хүрээ буруу байна (this-month, last-30-days, all-time)' })
  .default('this-month');

/** GET /performance/overview, /by-user, /user/:userId */
export const PerformanceQuerySchema = z.object({ period: PeriodSchema });
export type PerformanceQueryInput = z.infer<typeof PerformanceQuerySchema>;

/** GET /performance/timeline — without userId the whole visible scope is combined. */
export const PerformanceTimelineQuerySchema = PerformanceQuerySchema.extend({
  userId: z.uuid({ message: 'Хэрэглэгч буруу байна' }).optional(),
});
export type PerformanceTimelineQueryInput = z.infer<typeof PerformanceTimelineQuerySchema>;

/**
 * Task counts for a person or a scope. Active and overdue describe the current workload; completed and the
 * on-time figures cover the chosen period. `onTimeRate` is null when no completed task had a due date.
 */
export interface PerformanceMetrics {
  activeTasks: number;
  completedTasks: number;
  overdueTasks: number;
  completedWithDueDate: number;
  completedOnTime: number;
  onTimeRate: number | null;
}

export interface PerformanceRange {
  period: PerformancePeriod;
  from: string | null;
  to: string;
}

export interface PerformanceOverview extends PerformanceMetrics {
  range: PerformanceRange;
  scope: 'organization' | 'team';
  people: number;
}

export interface PerformancePerson {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  role: 'ADMIN' | 'LAWYER';
}

export interface PerformanceUserRow extends PerformanceMetrics {
  user: PerformancePerson;
  caseCount: number;
  isSelf: boolean;
}

export interface PerformanceByUser {
  range: PerformanceRange;
  items: PerformanceUserRow[];
}

export interface PerformanceRecentTask {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  completedAt: string | null;
  updatedAt: string;
  case: { id: string; caseNumber: string } | null;
}

export interface PerformanceUserDetail {
  range: PerformanceRange;
  user: PerformancePerson;
  isSelf: boolean;
  metrics: PerformanceMetrics & { caseCount: number };
  /** Active statuses are current; DONE counts completions and CANCELLED cancellations within the period. */
  byStatus: Record<TaskStatus, number>;
  /** Priorities of the active tasks (current workload). */
  byPriority: Record<TaskPriority, number>;
  /** Only tasks the viewer may open themselves. */
  recentTasks: PerformanceRecentTask[];
}

export interface PerformanceTimeline {
  range: PerformanceRange;
  granularity: 'day' | 'month';
  userId: string | null;
  buckets: { key: string; label: string; completed: number }[];
}
