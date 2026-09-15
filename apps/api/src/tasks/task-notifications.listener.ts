import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { TASK_STATUS_LABELS } from '@law-firm/shared';
import { NotificationsService, type CreateNotificationInput } from '../notifications/notifications.service';
import { TASK_EVENTS, type TaskAssignedEvent, type TaskCommentedEvent, type TaskRef, type TaskStatusChangedEvent } from './task.events';

const TYPE = 'TASK';
const link = (task: TaskRef) => `/admin/tasks/${task.id}`;
const context = (task: TaskRef) => task.caseNumber ?? 'Дотоод ажил';

/** Task events → notifications for the people involved, never for the person who acted. */
@Injectable()
export class TaskNotificationsListener {
  private readonly logger = new Logger(TaskNotificationsListener.name);

  constructor(private readonly notifications: NotificationsService) {}

  @OnEvent(TASK_EVENTS.assigned)
  async onAssigned(event: TaskAssignedEvent): Promise<void> {
    const { task } = event;
    await this.notify(task, [task.assigneeId], event.actorId, {
      title: `Танд даалгавар оноолоо: ${truncate(task.title)}`,
      body: context(task),
    });
  }

  @OnEvent(TASK_EVENTS.statusChanged)
  async onStatusChanged(event: TaskStatusChangedEvent): Promise<void> {
    const { task } = event;
    await this.notify(task, [task.createdById, task.assigneeId], event.actorId, {
      title: `Даалгавар «${TASK_STATUS_LABELS[event.to]}» боллоо: ${truncate(task.title)}`,
      body: `${context(task)} · ${TASK_STATUS_LABELS[event.from]}-аас ${TASK_STATUS_LABELS[event.to]}`,
    });
  }

  @OnEvent(TASK_EVENTS.commented)
  async onCommented(event: TaskCommentedEvent): Promise<void> {
    const { task } = event;
    await this.notify(task, [task.assigneeId, task.createdById], event.authorId, {
      title: `Даалгаварт коммент: ${truncate(task.title)}`,
      body: truncate(event.body.replace(/\s+/g, ' ').trim(), 140),
    });
  }

  private async notify(task: TaskRef, candidates: string[], actorId: string, content: Pick<CreateNotificationInput, 'title' | 'body'>) {
    const recipients = [...new Set(candidates)].filter((userId) => userId !== actorId);
    if (recipients.length === 0) return;
    try {
      await this.notifications.createMany(recipients.map((userId) => ({ userId, type: TYPE, link: link(task), actorId, ...content })));
    } catch (error) {
      this.logger.error(`Could not notify about task ${task.id}: ${(error as Error).message}`);
    }
  }
}

function truncate(text: string, max = 120): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}
