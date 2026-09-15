import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { CaseEventsService } from './case-events.service';
import { CaseMemberNotificationsListener } from './case-member-notifications.listener';
import { CaseMembersController } from './case-members.controller';
import { CaseMembersService } from './case-members.service';
import { CaseEventsController, CasesController } from './cases.controller';
import { CasesService } from './cases.service';

@Module({
  imports: [NotificationsModule],
  controllers: [CasesController, CaseEventsController, CaseMembersController],
  providers: [CasesService, CaseEventsService, CaseMembersService, CaseMemberNotificationsListener],
  exports: [CasesService],
})
export class CasesModule {}
