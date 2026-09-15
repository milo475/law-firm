import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { CaseEventsService } from './case-events.service';
import { CaseEventsController, CasesController } from './cases.controller';
import { CasesService } from './cases.service';

@Module({
  imports: [NotificationsModule],
  controllers: [CasesController, CaseEventsController],
  providers: [CasesService, CaseEventsService],
  exports: [CasesService],
})
export class CasesModule {}
