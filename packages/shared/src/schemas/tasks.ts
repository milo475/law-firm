import { z } from 'zod';
import type { TaskPriority, TaskStatus } from '../generated/prisma/enums.js';
import { DateInputSchema, PaginationSchema } from './common.js';

export const TASK_STATUSES = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE', 'CANCELLED'] as const satisfies readonly TaskStatus[];
export const TASK_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const satisfies readonly TaskPriority[];
export const TaskStatusSchema = z.enum(TASK_STATUSES, { message: 'Даалгаврын төлөв буруу байна' });
export const TaskPrioritySchema = z.enum(TASK_PRIORITIES, { message: 'Ач холбогдол буруу байна' });

/** Statuses that still need work (Kanban columns except DONE, overdue checks, summaries). */
export const ACTIVE_TASK_STATUSES = ['TODO', 'IN_PROGRESS', 'REVIEW'] as const satisfies readonly TaskStatus[];

/**
 * TODO ↔ IN_PROGRESS ↔ REVIEW → DONE; any status except CANCELLED can be cancelled.
 * DONE sets completedAt. CANCELLED is final.
 */
export const TASK_STATUS_TRANSITIONS: Record<TaskStatus, readonly TaskStatus[]> = {
  TODO: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['TODO', 'REVIEW', 'CANCELLED'],
  REVIEW: ['IN_PROGRESS', 'DONE', 'CANCELLED'],
  DONE: ['CANCELLED'],
  CANCELLED: [],
};

export function canTransitionTask(from: TaskStatus, to: TaskStatus): boolean {
  return TASK_STATUS_TRANSITIONS[from].includes(to);
}

const TaskTitleSchema = z
  .string({ message: 'Даалгаврын гарчгийг бичнэ үү' })
  .trim()
  .min(2, 'Гарчиг хамгийн багадаа 2 тэмдэгт байна')
  .max(200, 'Гарчиг хэт урт байна');
const TaskDescriptionSchema = z.string().trim().max(5000, 'Тайлбар хэт урт байна');

/** POST /tasks */
export const CreateTaskSchema = z.object({
  title: TaskTitleSchema,
  description: TaskDescriptionSchema.optional(),
  caseId: z.uuid({ message: 'Хэрэг буруу байна' }).optional(),
  assigneeId: z.uuid({ message: 'Гүйцэтгэгчээ сонгоно уу' }),
  priority: TaskPrioritySchema.default('MEDIUM'),
  dueDate: DateInputSchema.optional(),
});
export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;

/** PATCH /tasks/:id — no defaults, so omitted fields stay unchanged. */
export const UpdateTaskSchema = z.object({
  title: TaskTitleSchema.optional(),
  description: TaskDescriptionSchema.nullable().optional(),
  assigneeId: z.uuid({ message: 'Гүйцэтгэгчээ сонгоно уу' }).optional(),
  priority: TaskPrioritySchema.optional(),
  dueDate: DateInputSchema.nullable().optional(),
  status: TaskStatusSchema.optional(),
});
export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>;

/** POST /tasks/:id/comments */
export const CreateTaskCommentSchema = z.object({
  body: z.string({ message: 'Коммент бичнэ үү' }).trim().min(1, 'Коммент бичнэ үү').max(2000, 'Коммент 2000 тэмдэгтээс хэтрэхгүй байна'),
});
export type CreateTaskCommentInput = z.infer<typeof CreateTaskCommentSchema>;

export const TASK_SORTS = ['dueDate', 'priority', 'createdAt'] as const;

/** GET /tasks — scope=mine limits to the viewer's own assignments; overdue=true keeps active tasks past their due date. */
export const TaskQuerySchema = PaginationSchema.extend({
  scope: z.enum(['mine', 'all']).optional(),
  assigneeId: z.uuid().optional(),
  status: TaskStatusSchema.optional(),
  priority: TaskPrioritySchema.optional(),
  caseId: z.uuid().optional(),
  overdue: z
    .union([z.boolean(), z.enum(['true', 'false'])])
    .transform((value) => value === true || value === 'true')
    .optional(),
  sort: z.enum(TASK_SORTS).default('dueDate'),
});
export type TaskQueryInput = z.infer<typeof TaskQuerySchema>;

/** GET /tasks/my-summary */
export interface TaskSummary {
  active: number;
  overdue: number;
  byStatus: Record<(typeof ACTIVE_TASK_STATUSES)[number], number>;
}
