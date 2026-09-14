import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators';
import type { RequestUser } from '../common/types/request-user';
import { InvoiceQueryDto } from './dto/invoices.dto';
import { InvoicesService } from './invoices.service';

@ApiTags('invoices')
@ApiBearerAuth()
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoices: InvoicesService) {}

  @Get()
  @ApiOperation({ summary: 'Нэхэмжлэхүүд (хэргийн scope-оор)' })
  findAll(@Query() query: InvoiceQueryDto, @CurrentUser() user: RequestUser) {
    return this.invoices.findAll(query, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Нэхэмжлэхийн дэлгэрэнгүй' })
  findOne(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.invoices.findOne(id, user);
  }
}
