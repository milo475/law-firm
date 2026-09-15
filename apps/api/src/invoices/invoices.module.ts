import { Module } from '@nestjs/common';
import { CasesModule } from '../cases/cases.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { InvoicePaymentNotificationsListener } from './invoice-payment-notifications.listener';
import { InvoicePaymentsController } from './invoice-payments.controller';
import { InvoicePaymentsService } from './invoice-payments.service';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';

@Module({
  imports: [CasesModule, NotificationsModule],
  // Payments first: its static `payment-summary` route must win over `GET /invoices/:id`.
  controllers: [InvoicePaymentsController, InvoicesController],
  providers: [InvoicesService, InvoicePaymentsService, InvoicePaymentNotificationsListener],
})
export class InvoicesModule {}
