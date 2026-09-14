import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MAX_DOCUMENT_SIZE_BYTES } from '@law-firm/shared';
import { CurrentUser } from '../common/decorators';
import type { RequestUser } from '../common/types/request-user';
import { DocumentsService, type UploadedFile as UploadedFileShape } from './documents.service';
import { UploadDocumentDto } from './dto/documents.dto';

@ApiTags('documents')
@ApiBearerAuth()
@Controller()
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Get('cases/:id/documents')
  @ApiOperation({ summary: 'Хэргийн баримтууд (CLIENT → зөвхөн харагдах баримт)' })
  findByCase(@Param('id') caseId: string, @CurrentUser() user: RequestUser) {
    return this.documents.findByCase(caseId, user);
  }

  @Post('cases/:id/documents')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_DOCUMENT_SIZE_BYTES } }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        name: { type: 'string' },
        isVisibleToClient: { type: 'boolean' },
      },
    },
  })
  @ApiOperation({ summary: 'Хэрэгт баримт хавсаргах (MinIO-д хадгална)' })
  upload(
    @Param('id') caseId: string,
    @UploadedFile() file: UploadedFileShape | undefined,
    @Body() dto: UploadDocumentDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.documents.upload(caseId, file, dto, user);
  }

  @Get('documents/:id/download')
  @ApiOperation({ summary: 'Баримт татах presigned URL (5 мин хүчинтэй)' })
  download(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.documents.downloadUrl(id, user);
  }
}
