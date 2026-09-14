import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators';
import type { RequestUser } from '../common/types/request-user';
import { CasesService } from './cases.service';
import { CaseQueryDto } from './dto/cases.dto';

@ApiTags('cases')
@ApiBearerAuth()
@Controller('cases')
export class CasesController {
  constructor(private readonly cases: CasesService) {}

  @Get()
  @ApiOperation({ summary: 'Хэргүүд (CLIENT → өөрийн, LAWYER → хариуцсан, ADMIN → бүгд)' })
  findAll(@Query() query: CaseQueryDto, @CurrentUser() user: RequestUser) {
    return this.cases.findAll(query, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Хэргийн дэлгэрэнгүй (scope шалгана)' })
  findOne(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.cases.findOne(id, user);
  }

  @Get(':id/events')
  @ApiOperation({ summary: 'Хэргийн явцын түүх (CLIENT → зөвхөн харагдах event)' })
  findEvents(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.cases.findEvents(id, user);
  }
}
