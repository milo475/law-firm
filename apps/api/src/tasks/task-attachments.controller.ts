import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MAX_TASK_ATTACHMENT_SIZE_BYTES, Role } from '@law-firm/shared';
import { CurrentUser, Roles } from '../common/decorators';
import type { RequestUser } from '../common/types/request-user';
import type { UploadedFile as UploadedFileShape } from '../documents/documents.service';
import { UploadTaskAttachmentDto } from './dto/task-attachments.dto';
import { TaskAttachmentsService } from './task-attachments.service';

@ApiTags('tasks')
@ApiBearerAuth()
@Roles(Role.ADMIN, Role.LAWYER)
@Controller()
export class TaskAttachmentsController {
  constructor(private readonly attachments: TaskAttachmentsService) {}

  @Get('tasks/:id/attachments')
  @ApiOperation({ summary: 'Даалгаврын хавсралтууд (даалгаврыг харах эрхтэй хүн)' })
  list(@Param('id') taskId: string, @CurrentUser() user: RequestUser) {
    return this.attachments.list(taskId, user);
  }

  @Post('tasks/:id/attachments')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_TASK_ATTACHMENT_SIZE_BYTES } }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' }, name: { type: 'string' } } } })
  @ApiOperation({ summary: 'Даалгаварт файл хавсаргах (PDF, Word, Excel, зураг, текст · 20MB; MinIO)' })
  upload(
    @Param('id') taskId: string,
    @UploadedFile() file: UploadedFileShape | undefined,
    @Body() dto: UploadTaskAttachmentDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.attachments.upload(taskId, file, dto, user);
  }

  @Get('task-attachments/:id/download')
  @ApiOperation({ summary: 'Хавсралт татах presigned URL (5 мин)' })
  download(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.attachments.downloadUrl(id, user);
  }

  @Delete('task-attachments/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Хавсралт устгах (хавсаргасан хүн эсвэл ADMIN)' })
  remove(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.attachments.remove(id, user);
  }
}
