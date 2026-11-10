import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@law-firm/shared';
import { CurrentUser, Roles } from '../common/decorators';
import { CASE_PARTICIPANT_ROLES } from '../common/permissions';
import type { RequestUser } from '../common/types/request-user';
import { CreateInvoiceDto, InvoiceQueryDto, UpdateInvoiceDto } from './dto/invoices.dto';
import { InvoicesService } from './invoices.service';

@ApiTags('invoices')
@ApiBearerAuth()
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoices: InvoicesService) {}

  @Roles(...CASE_PARTICIPANT_ROLES)
  @Get()
  @ApiOperation({ summary: 'Нэхэмжлэхүүд (хэргийн scope-оор)' })
  findAll(@Query() query: InvoiceQueryDto, @CurrentUser() user: RequestUser) {
    return this.invoices.findAll(query, user);
  }

  @Roles(Role.ADMIN, Role.LAWYER)
  @Post()
  @ApiOperation({ summary: '[ADMIN, хариуцсан LAWYER] Нэхэмжлэх үүсгэх (DRAFT, дугаар автоматаар)' })
  create(@Body() dto: CreateInvoiceDto, @CurrentUser() user: RequestUser) {
    return this.invoices.create(dto, user);
  }

  @Roles(...CASE_PARTICIPANT_ROLES)
  @Get(':id')
  @ApiOperation({ summary: 'Нэхэмжлэхийн дэлгэрэнгүй' })
  findOne(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.invoices.findOne(id, user);
  }

  @Roles(Role.ADMIN, Role.LAWYER)
  @Patch(':id')
  @ApiOperation({ summary: '[ADMIN, хариуцсан LAWYER] Нэхэмжлэх засах / төлөв шилжүүлэх (SENT → харилцагчид мэдэгдэл)' })
  update(@Param('id') id: string, @Body() dto: UpdateInvoiceDto, @CurrentUser() user: RequestUser) {
    return this.invoices.update(id, dto, user);
  }
}
