import { Module } from '@nestjs/common';
import { CasesModule } from '../cases/cases.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { MessageNotificationsListener } from './message-notifications.listener';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';

@Module({
  imports: [CasesModule, NotificationsModule],
  controllers: [MessagesController],
  providers: [MessagesService, MessageNotificationsListener],
})
export class MessagesModule {}
