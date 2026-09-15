import { Module } from '@nestjs/common';
import { CasesModule } from '../cases/cases.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ServiceRequestNotificationsListener } from './service-request-notifications.listener';
import { ServiceRequestsController } from './service-requests.controller';
import { ServiceRequestsService } from './service-requests.service';

@Module({
  imports: [CasesModule, NotificationsModule],
  controllers: [ServiceRequestsController],
  providers: [ServiceRequestsService, ServiceRequestNotificationsListener],
})
export class ServiceRequestsModule {}
