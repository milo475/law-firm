import { Module } from '@nestjs/common';
import { CasesModule } from '../cases/cases.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { TaskAttachmentsController } from './task-attachments.controller';
import { TaskAttachmentsService } from './task-attachments.service';
import { TaskNotificationsListener } from './task-notifications.listener';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

@Module({
  imports: [CasesModule, NotificationsModule],
  controllers: [TasksController, TaskAttachmentsController],
  providers: [TasksService, TaskAttachmentsService, TaskNotificationsListener],
  exports: [TasksService],
})
export class TasksModule {}
