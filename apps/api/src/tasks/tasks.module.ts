import { Module } from '@nestjs/common';
import { CasesModule } from '../cases/cases.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { TaskNotificationsListener } from './task-notifications.listener';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

@Module({
  imports: [CasesModule, NotificationsModule],
  controllers: [TasksController],
  providers: [TasksService, TaskNotificationsListener],
})
export class TasksModule {}
