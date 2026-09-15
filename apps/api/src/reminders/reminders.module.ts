import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationsModule } from '../notifications/notifications.module';
import { RemindersController } from './reminders.controller';
import { RemindersScheduler } from './reminders.scheduler';
import { RemindersService } from './reminders.service';

@Module({
  imports: [ScheduleModule.forRoot(), NotificationsModule],
  controllers: [RemindersController],
  providers: [RemindersService, RemindersScheduler],
})
export class RemindersModule {}
