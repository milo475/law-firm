import { Module } from '@nestjs/common';
import { CasesModule } from '../cases/cases.module';
import { DocumentsModule } from '../documents/documents.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { DocumentRequestNotificationsListener } from './document-request-notifications.listener';
import { DocumentRequestsController } from './document-requests.controller';
import { DocumentRequestsService } from './document-requests.service';

@Module({
  imports: [CasesModule, DocumentsModule, NotificationsModule],
  controllers: [DocumentRequestsController],
  providers: [DocumentRequestsService, DocumentRequestNotificationsListener],
})
export class DocumentRequestsModule {}
