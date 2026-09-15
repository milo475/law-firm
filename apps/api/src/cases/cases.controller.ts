import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@law-firm/shared';
import { CurrentUser, Roles } from '../common/decorators';
import type { RequestUser } from '../common/types/request-user';
import { CaseEventsService } from './case-events.service';
import { CasesService } from './cases.service';
import {
  CaseQueryDto,
  CloseCaseDto,
  CreateCaseDto,
  CreateCaseEventDto,
  UpdateCaseDto,
  UpdateCaseEventDto,
} from './dto/cases.dto';

@ApiTags('cases')
@ApiBearerAuth()
@Controller('cases')
export class CasesController {
  constructor(
    private readonly cases: CasesService,
    private readonly events: CaseEventsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Хэргүүд (CLIENT → өөрийн, LAWYER → хариуцсан, ADMIN → бүгд)' })
  findAll(@Query() query: CaseQueryDto, @CurrentUser() user: RequestUser) {
    return this.cases.findAll(query, user);
  }

  @Roles(Role.ADMIN, Role.LAWYER)
  @Post()
  @ApiOperation({ summary: '[ADMIN, LAWYER] Хэрэг үүсгэх (дугаар автоматаар)' })
  create(@Body() dto: CreateCaseDto, @CurrentUser() user: RequestUser) {
    return this.cases.create(dto, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Хэргийн дэлгэрэнгүй (scope шалгана)' })
  findOne(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.cases.findOne(id, user);
  }

  @Roles(Role.ADMIN, Role.LAWYER)
  @Patch(':id')
  @ApiOperation({ summary: '[ADMIN, хариуцсан LAWYER] Хэрэг засах; төлөв өөрчлөгдвөл STATUS_CHANGE event' })
  update(@Param('id') id: string, @Body() dto: UpdateCaseDto, @CurrentUser() user: RequestUser) {
    return this.cases.update(id, dto, user);
  }

  @Roles(Role.ADMIN, Role.LAWYER)
  @Patch(':id/close')
  @ApiOperation({ summary: '[ADMIN, хариуцсан LAWYER] Хэрэг хаах' })
  close(@Param('id') id: string, @Body() dto: CloseCaseDto, @CurrentUser() user: RequestUser) {
    return this.cases.close(id, dto, user);
  }

  @Get(':id/events')
  @ApiOperation({ summary: 'Хэргийн явцын түүх (CLIENT → зөвхөн харагдах event)' })
  findEvents(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.cases.findEvents(id, user);
  }

  @Roles(Role.ADMIN, Role.LAWYER)
  @Post(':id/events')
  @ApiOperation({ summary: '[ADMIN, хариуцсан LAWYER] Үйл явдал нэмэх (харилцагчид мэдэгдэл)' })
  createEvent(@Param('id') id: string, @Body() dto: CreateCaseEventDto, @CurrentUser() user: RequestUser) {
    return this.events.create(id, dto, user);
  }
}

@ApiTags('cases')
@ApiBearerAuth()
@Controller('events')
export class CaseEventsController {
  constructor(private readonly events: CaseEventsService) {}

  @Roles(Role.ADMIN, Role.LAWYER)
  @Patch(':id')
  @ApiOperation({ summary: '[ADMIN, хариуцсан LAWYER] Үйл явдал засах' })
  update(@Param('id') id: string, @Body() dto: UpdateCaseEventDto, @CurrentUser() user: RequestUser) {
    return this.events.update(id, dto, user);
  }

  @Roles(Role.ADMIN, Role.LAWYER)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '[ADMIN, хариуцсан LAWYER] Үйл явдал устгах' })
  remove(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.events.remove(id, user);
  }
}
