import type { TaskStatus } from '@law-firm/shared';

export const TASK_EVENTS = {
  assigned: 'task.assigned',
  statusChanged: 'task.status-changed',
  commented: 'task.commented',
} as const;

export interface TaskRef {
  id: string;
  title: string;
  caseNumber: string | null;
  assigneeId: string;
  createdById: string;
}

export interface TaskAssignedEvent {
  task: TaskRef;
  actorId: string;
}

export interface TaskStatusChangedEvent {
  task: TaskRef;
  from: TaskStatus;
  to: TaskStatus;
  actorId: string;
}

export interface TaskCommentedEvent {
  task: TaskRef;
  authorId: string;
  body: string;
}
