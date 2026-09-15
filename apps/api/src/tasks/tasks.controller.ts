import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@law-firm/shared';
import { CurrentUser, Roles } from '../common/decorators';
import type { RequestUser } from '../common/types/request-user';
import { CreateTaskCommentDto, CreateTaskDto, TaskQueryDto, UpdateTaskDto } from './dto/tasks.dto';
import { TasksService } from './tasks.service';

@ApiTags('tasks')
@ApiBearerAuth()
@Roles(Role.ADMIN, Role.LAWYER)
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  @Get()
  @ApiOperation({ summary: 'Даалгаврууд (ADMIN → бүгд; LAWYER → өөрт оноогдсон, өөрийн үүсгэсэн, багийн хэргийн)' })
  findAll(@Query() query: TaskQueryDto, @CurrentUser() user: RequestUser) {
    return this.tasks.findAll(query, user);
  }

  @Get('my-summary')
  @ApiOperation({ summary: 'Надад оноогдсон идэвхтэй даалгавар төлвөөр, хугацаа хэтэрсэн тоо' })
  mySummary(@CurrentUser() user: RequestUser) {
    return this.tasks.mySummary(user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Даалгаврын дэлгэрэнгүй, коммент, эрхүүд' })
  findOne(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.tasks.findOne(id, user);
  }

  @Post()
  @ApiOperation({ summary: 'Даалгавар үүсгэх (хэрэгт бол үүсгэгч, гүйцэтгэгч хоёулаа багийн гишүүн; хэрэггүй бол LAWYER зөвхөн өөртөө)' })
  create(@Body() dto: CreateTaskDto, @CurrentUser() user: RequestUser) {
    return this.tasks.create(dto, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Засах: дэлгэрэнгүй/гүйцэтгэгч — үүсгэгч, ADMIN; төлөв — гүйцэтгэгч, үүсгэгч, ADMIN' })
  update(@Param('id') id: string, @Body() dto: UpdateTaskDto, @CurrentUser() user: RequestUser) {
    return this.tasks.update(id, dto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '[ADMIN, үүсгэсэн хүн] Даалгавар устгах' })
  remove(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.tasks.remove(id, user);
  }

  @Post(':id/comments')
  @ApiOperation({ summary: 'Коммент нэмэх (даалгаврыг харах эрхтэй хүн)' })
  addComment(@Param('id') id: string, @Body() dto: CreateTaskCommentDto, @CurrentUser() user: RequestUser) {
    return this.tasks.addComment(id, dto, user);
  }
}
