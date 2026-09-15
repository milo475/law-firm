import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@law-firm/shared';
import { CurrentUser, Roles } from '../common/decorators';
import type { RequestUser } from '../common/types/request-user';
import { MarkPaymentDto, RejectPaymentDto } from './dto/invoices.dto';
import { InvoicePaymentsService } from './invoice-payments.service';

/** Registered before InvoicesController so `payment-summary` is not captured by `GET /invoices/:id`. */
@ApiTags('invoices')
@ApiBearerAuth()
@Controller('invoices')
export class InvoicePaymentsController {
  constructor(private readonly payments: InvoicePaymentsService) {}

  @Get('payment-summary')
  @ApiOperation({ summary: 'Баталгаажуулалт хүлээж буй төлбөрүүд (хэргийн scope-оор)' })
  summary(@CurrentUser() user: RequestUser) {
    return this.payments.summary(user);
  }

  @Roles(Role.CLIENT)
  @Post(':id/mark-paid')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[хэргийн CLIENT] SENT/OVERDUE нэхэмжлэхийг төлсөн гэж тэмдэглэх → AWAITING_CONFIRMATION' })
  markPaid(@Param('id') id: string, @Body() dto: MarkPaymentDto, @CurrentUser() user: RequestUser) {
    return this.payments.markPaid(id, dto, user);
  }

  @Roles(Role.ADMIN, Role.LAWYER)
  @Post(':id/confirm-payment')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[ADMIN, хариуцсан LAWYER] Төлбөр баталгаажуулах → PAID' })
  confirm(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.payments.confirm(id, user);
  }

  @Roles(Role.ADMIN, Role.LAWYER)
  @Post(':id/reject-payment')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[ADMIN, хариуцсан LAWYER] Төлбөр татгалзах (шалтгаантай) → SENT' })
  reject(@Param('id') id: string, @Body() dto: RejectPaymentDto, @CurrentUser() user: RequestUser) {
    return this.payments.reject(id, dto, user);
  }
}
