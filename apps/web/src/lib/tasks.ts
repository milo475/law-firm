'use client';

import { TASK_STATUS_TRANSITIONS } from '@law-firm/shared/schemas';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { api, type PublicUser } from './api';

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE' | 'CANCELLED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export const TASK_STATUSES: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE', 'CANCELLED'];
/** Kanban columns; cancelled tasks only show in the list. */
export const BOARD_STATUSES: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'];
export const TASK_PRIORITIES: TaskPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
const ACTIVE_STATUSES: readonly TaskStatus[] = ['TODO', 'IN_PROGRESS', 'REVIEW'];

/** GET /tasks item */
export interface TaskItem {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  caseId: string | null;
  assigneeId: string;
  createdById: string;
  case: { id: string; caseNumber: string; title: string } | null;
  assignee: PublicUser;
  createdBy: PublicUser;
  _count: { comments: number };
}

export interface TaskCommentItem {
  id: string;
  body: string;
  createdAt: string;
  author: PublicUser;
}

/** GET /tasks/:id */
export interface TaskDetail extends TaskItem {
  comments: TaskCommentItem[];
  permissions: { canEdit: boolean; canDelete: boolean; canChangeStatus: boolean };
}

/** GET /tasks/my-summary */
export interface TaskSummary {
  active: number;
  overdue: number;
  byStatus: Record<'TODO' | 'IN_PROGRESS' | 'REVIEW', number>;
}

type Viewer = { id: string; role: string };

export const TASKS_KEY = ['tasks'] as const;
export const TASK_SUMMARY_KEY = ['tasks', 'my-summary'] as const;
export const taskListKey = (query: string) => ['tasks', 'list', query] as const;
export const taskKey = (id: string) => ['tasks', 'detail', id] as const;

export const isTaskActive = (task: Pick<TaskItem, 'status'>) => ACTIVE_STATUSES.includes(task.status);

/** Past its due date while still open (shown in red). */
export function isTaskOverdue(task: Pick<TaskItem, 'status' | 'dueDate'>, now = new Date()): boolean {
  if (!task.dueDate || !isTaskActive(task)) return false;
  return new Date(task.dueDate).getTime() < now.getTime();
}

/** Mirrors the API: the assignee, the creator or an admin moves a task. */
export function canChangeTaskStatus(task: Pick<TaskItem, 'assigneeId' | 'createdById'>, viewer: Viewer): boolean {
  return viewer.role === 'ADMIN' || task.assigneeId === viewer.id || task.createdById === viewer.id;
}

/** Where the task can move next; cancelling is offered separately on the detail page. */
export function nextTaskStatuses(status: TaskStatus): TaskStatus[] {
  return (TASK_STATUS_TRANSITIONS as Record<TaskStatus, readonly TaskStatus[]>)[status].filter((next) => next !== 'CANCELLED');
}

export const isForwardMove = (from: TaskStatus, to: TaskStatus) => BOARD_STATUSES.indexOf(to) > BOARD_STATUSES.indexOf(from);

export function taskActionLabel(from: TaskStatus, to: TaskStatus): string {
  switch (to) {
    case 'IN_PROGRESS':
      return from === 'TODO' ? 'Эхлүүлэх' : 'Дахин ажиллах';
    case 'REVIEW':
      return 'Хянуулах';
    case 'DONE':
      return 'Дуусгах';
    case 'TODO':
      return 'Хийх рүү буцаах';
    default:
      return 'Цуцлах';
  }
}

/** Active tasks assigned to the viewer (sidebar badge, dashboard tiles). */
export function useTaskSummary(enabled = true) {
  return useQuery({
    queryKey: TASK_SUMMARY_KEY,
    queryFn: () => api.get<TaskSummary>('/tasks/my-summary'),
    enabled,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

/** Refreshes task lists, details and the summary. */
export function useInvalidateTasks() {
  const queryClient = useQueryClient();
  return useCallback(() => queryClient.invalidateQueries({ queryKey: TASKS_KEY }), [queryClient]);
}
