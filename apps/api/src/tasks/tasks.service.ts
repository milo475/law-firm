import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  ACTIVE_TASK_STATUSES,
  Role,
  TASK_STATUS_LABELS,
  TaskStatus,
  canTransitionTask,
  type CreateTaskCommentInput,
  type CreateTaskInput,
  type Paginated,
  type Prisma,
  type TaskQueryInput,
  type TaskSummary,
  type UpdateTaskInput,
} from '@law-firm/shared';
import { CASE_MEMBERSHIP_SELECT, CasesService, type CaseScopeRecord } from '../cases/cases.service';
import type { RequestUser } from '../common/types/request-user';
import { paginate, skipTake } from '../common/utils/pagination';
import { PUBLIC_USER_SELECT } from '../common/utils/safe-user';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import {
  TASK_EVENTS,
  type TaskAssignedEvent,
  type TaskCommentedEvent,
  type TaskRef,
  type TaskStatusChangedEvent,
} from './task.events';

const TASK_SELECT = {
  id: true,
  title: true,
  description: true,
  status: true,
  priority: true,
  dueDate: true,
  completedAt: true,
  createdAt: true,
  updatedAt: true,
  caseId: true,
  assigneeId: true,
  createdById: true,
  case: { select: { id: true, caseNumber: true, title: true } },
  assignee: { select: PUBLIC_USER_SELECT },
  createdBy: { select: PUBLIC_USER_SELECT },
  _count: { select: { comments: true } },
} satisfies Prisma.TaskSelect;

const TASK_ACCESS_SELECT = {
  id: true,
  title: true,
  status: true,
  assigneeId: true,
  createdById: true,
  caseId: true,
  case: { select: { caseNumber: true, clientId: true, lawyerId: true, members: CASE_MEMBERSHIP_SELECT } },
} satisfies Prisma.TaskSelect;

type TaskAccess = Prisma.TaskGetPayload<{ select: typeof TASK_ACCESS_SELECT }>;

const ACTIVE: TaskStatus[] = [...ACTIVE_TASK_STATUSES];

function toRef(task: { id: string; title: string; assigneeId: string; createdById: string; case: { caseNumber: string } | null }): TaskRef {
  return { id: task.id, title: task.title, caseNumber: task.case?.caseNumber ?? null, assigneeId: task.assigneeId, createdById: task.createdById };
}

/**
 * Staff tasks. ADMIN: everything. LAWYER: tasks assigned to or created by them, and tasks of cases whose team they are on.
 * Status: assignee, creator or ADMIN. Details, reassigning and deleting: creator or ADMIN. CLIENT never sees tasks.
 */
@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cases: CasesService,
    private readonly events: EventEmitter2,
    /** Removes attachment objects from MinIO when a task is deleted (optional so unit tests can skip it). */
    @Optional() private readonly storage?: StorageService,
  ) {}

  visibleWhere(user: RequestUser): Prisma.TaskWhereInput {
    if (user.role === Role.ADMIN) return {};
    if (user.role === Role.LAWYER) {
      return { OR: [{ assigneeId: user.id }, { createdById: user.id }, { case: { members: { some: { userId: user.id } } } }] };
    }
    throw new ForbiddenException('Даалгавар зөвхөн ажилтанд харагдана');
  }

  async findAll(query: TaskQueryInput, user: RequestUser): Promise<Paginated<unknown>> {
    const filters: Prisma.TaskWhereInput[] = [this.visibleWhere(user)];
    if (query.scope === 'mine') filters.push({ assigneeId: user.id });
    if (query.assigneeId) filters.push({ assigneeId: query.assigneeId });
    if (query.status) filters.push({ status: query.status });
    if (query.priority) filters.push({ priority: query.priority });
    if (query.caseId) filters.push({ caseId: query.caseId });
    if (query.overdue) filters.push({ dueDate: { lt: new Date() }, status: { in: ACTIVE } });
    const where: Prisma.TaskWhereInput = { AND: filters };

    const orderBy: Prisma.TaskOrderByWithRelationInput[] =
      query.sort === 'priority'
        ? [{ priority: 'desc' }, { dueDate: { sort: 'asc', nulls: 'last' } }]
        : query.sort === 'createdAt'
          ? [{ createdAt: 'desc' }]
          : [{ dueDate: { sort: 'asc', nulls: 'last' } }, { priority: 'desc' }];

    const [items, total] = await Promise.all([
      this.prisma.task.findMany({ where, select: TASK_SELECT, orderBy, ...skipTake(query.page, query.limit) }),
      this.prisma.task.count({ where }),
    ]);
    return paginate(items, total, query.page, query.limit);
  }

  async findOne(id: string, user: RequestUser) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      select: {
        ...TASK_SELECT,
        case: { select: { id: true, caseNumber: true, title: true, clientId: true, lawyerId: true, members: CASE_MEMBERSHIP_SELECT } },
        comments: { select: { id: true, body: true, createdAt: true, author: { select: PUBLIC_USER_SELECT } }, orderBy: { createdAt: 'asc' } },
      },
    });
    if (!task) throw new NotFoundException('Даалгавар олдсонгүй');
    this.assertCanView(task, user);
    const { case: caseInfo, ...rest } = task;
    return {
      ...rest,
      case: caseInfo ? { id: caseInfo.id, caseNumber: caseInfo.caseNumber, title: caseInfo.title } : null,
      permissions: this.permissionsFor(task, user),
    };
  }

  async create(input: CreateTaskInput, user: RequestUser) {
    let caseRecord: (CaseScopeRecord & { caseNumber: string }) | null = null;
    if (input.caseId) {
      // The creator has to work on the case (ADMIN always does).
      caseRecord = await this.cases.assertStaffAccessById(input.caseId, user);
    } else if (user.role !== Role.ADMIN && input.assigneeId !== user.id) {
      throw new ForbiddenException('Хэрэгт холбоогүй даалгаврыг зөвхөн өөртөө үүсгэнэ');
    }
    await this.assertAssignable(input.assigneeId, caseRecord, user);

    const task = await this.prisma.task.create({
      data: {
        title: input.title,
        description: input.description?.trim() ? input.description.trim() : null,
        caseId: input.caseId ?? null,
        assigneeId: input.assigneeId,
        createdById: user.id,
        priority: input.priority,
        dueDate: input.dueDate ?? null,
      },
      select: TASK_SELECT,
    });
    const event: TaskAssignedEvent = { task: toRef(task), actorId: user.id };
    await this.events.emitAsync(TASK_EVENTS.assigned, event);
    return task;
  }

  async update(id: string, input: UpdateTaskInput, user: RequestUser) {
    const task = await this.loadAccess(id);
    this.assertCanView(task, user);
    const { canEdit, canChangeStatus } = this.permissionsFor(task, user);

    const editsDetails =
      input.title !== undefined || input.description !== undefined || input.priority !== undefined || input.dueDate !== undefined || input.assigneeId !== undefined;
    if (editsDetails && !canEdit) throw new ForbiddenException('Даалгаврыг зөвхөн үүсгэсэн хүн эсвэл админ засна');

    const statusChanged = input.status !== undefined && input.status !== task.status;
    if (statusChanged) {
      if (!canChangeStatus) throw new ForbiddenException('Төлвийг гүйцэтгэгч, үүсгэсэн хүн эсвэл админ өөрчилнө');
      if (!canTransitionTask(task.status, input.status as TaskStatus)) {
        throw new BadRequestException(
          `Даалгаврыг «${TASK_STATUS_LABELS[task.status]}»-аас «${TASK_STATUS_LABELS[input.status as TaskStatus]}» болгох боломжгүй`,
        );
      }
    }

    const assigneeChanged = input.assigneeId !== undefined && input.assigneeId !== task.assigneeId;
    if (assigneeChanged) await this.assertAssignable(input.assigneeId as string, task.case, user);

    const updated = await this.prisma.task.update({
      where: { id },
      data: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.description !== undefined ? { description: input.description?.trim() ? input.description.trim() : null } : {}),
        ...(input.priority !== undefined ? { priority: input.priority } : {}),
        ...(input.dueDate !== undefined ? { dueDate: input.dueDate } : {}),
        ...(assigneeChanged ? { assigneeId: input.assigneeId } : {}),
        ...(statusChanged ? { status: input.status, completedAt: input.status === TaskStatus.DONE ? new Date() : null } : {}),
      },
      select: TASK_SELECT,
    });

    if (assigneeChanged) {
      const event: TaskAssignedEvent = { task: toRef(updated), actorId: user.id };
      await this.events.emitAsync(TASK_EVENTS.assigned, event);
    }
    if (statusChanged) {
      const event: TaskStatusChangedEvent = { task: toRef(updated), from: task.status, to: input.status as TaskStatus, actorId: user.id };
      await this.events.emitAsync(TASK_EVENTS.statusChanged, event);
    }
    return updated;
  }

  async remove(id: string, user: RequestUser): Promise<void> {
    const task = await this.loadAccess(id);
    this.assertCanView(task, user);
    if (!this.permissionsFor(task, user).canDelete) {
      throw new ForbiddenException('Даалгаврыг зөвхөн үүсгэсэн хүн эсвэл админ устгана');
    }
    const attachments = this.storage ? await this.prisma.taskAttachment.findMany({ where: { taskId: id }, select: { storageKey: true } }) : [];
    await this.prisma.task.delete({ where: { id } });
    for (const { storageKey } of attachments) {
      try {
        await this.storage?.delete(storageKey);
      } catch (error) {
        this.logger.warn(`Could not remove attachment object ${storageKey}: ${(error as Error).message}`);
      }
    }
  }

  async addComment(id: string, input: CreateTaskCommentInput, user: RequestUser) {
    const task = await this.loadAccess(id);
    this.assertCanView(task, user);
    const comment = await this.prisma.taskComment.create({
      data: { taskId: id, authorId: user.id, body: input.body },
      select: { id: true, body: true, createdAt: true, author: { select: PUBLIC_USER_SELECT } },
    });
    const event: TaskCommentedEvent = { task: toRef(task), authorId: user.id, body: input.body };
    await this.events.emitAsync(TASK_EVENTS.commented, event);
    return comment;
  }

  /** Active tasks assigned to the viewer, per status, plus how many are past their due date. */
  async mySummary(user: RequestUser): Promise<TaskSummary> {
    const where: Prisma.TaskWhereInput = { assigneeId: user.id, status: { in: ACTIVE } };
    const [groups, overdue] = await Promise.all([
      this.prisma.task.groupBy({ by: ['status'], where, _count: { _all: true } }),
      this.prisma.task.count({ where: { ...where, dueDate: { lt: new Date() } } }),
    ]);
    const byStatus: TaskSummary['byStatus'] = { TODO: 0, IN_PROGRESS: 0, REVIEW: 0 };
    for (const group of groups) {
      if (group.status in byStatus) byStatus[group.status as keyof typeof byStatus] = group._count._all;
    }
    return { active: byStatus.TODO + byStatus.IN_PROGRESS + byStatus.REVIEW, overdue, byStatus };
  }

  // ─── helpers ───────────────────────────────────────────────────────────────

  private async loadAccess(id: string): Promise<TaskAccess> {
    const task = await this.prisma.task.findUnique({ where: { id }, select: TASK_ACCESS_SELECT });
    if (!task) throw new NotFoundException('Даалгавар олдсонгүй');
    return task;
  }

  /** 404 when the task does not exist, 403 when the viewer may not open it (used by task attachments). */
  async assertVisibleById(id: string, user: RequestUser): Promise<TaskAccess> {
    const task = await this.loadAccess(id);
    this.assertCanView(task, user);
    return task;
  }

  /** ADMIN, or a LAWYER who is the assignee, the creator or on the task's case team. */
  assertCanView(task: { assigneeId: string; createdById: string; case: CaseScopeRecord | null }, user: RequestUser): void {
    if (user.role === Role.ADMIN) return;
    if (
      user.role === Role.LAWYER &&
      (task.assigneeId === user.id || task.createdById === user.id || (task.case !== null && this.cases.isMember(task.case, user.id)))
    ) {
      return;
    }
    throw new ForbiddenException('Энэ даалгаврыг үзэх эрх танд байхгүй байна');
  }

  private permissionsFor(task: { assigneeId: string; createdById: string }, user: RequestUser) {
    const isAdmin = user.role === Role.ADMIN;
    const isCreator = task.createdById === user.id;
    return {
      canEdit: isAdmin || isCreator,
      canDelete: isAdmin || isCreator,
      canChangeStatus: isAdmin || isCreator || task.assigneeId === user.id,
    };
  }

  /**
   * The assignee must be an active lawyer or admin. On a case, a LAWYER may only assign members of that case team;
   * ADMIN may assign anyone.
   */
  private async assertAssignable(assigneeId: string, caseRecord: CaseScopeRecord | null, user: RequestUser): Promise<void> {
    const assignee = await this.prisma.user.findUnique({ where: { id: assigneeId }, select: { id: true, role: true, isActive: true } });
    if (!assignee || !assignee.isActive || (assignee.role !== Role.LAWYER && assignee.role !== Role.ADMIN)) {
      throw new BadRequestException('Гүйцэтгэгч идэвхтэй хуульч эсвэл админ байх ёстой');
    }
    if (user.role === Role.ADMIN) return;
    if (caseRecord) {
      if (!this.cases.isMember(caseRecord, assigneeId)) {
        throw new BadRequestException('Гүйцэтгэгч энэ хэргийн багийн гишүүн байх ёстой');
      }
    } else if (assigneeId !== user.id) {
      throw new ForbiddenException('Хэрэгт холбоогүй даалгаврыг зөвхөн өөртөө оноох боломжтой');
    }
  }
}
