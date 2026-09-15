import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MAX_DOCUMENT_REQUEST_FILES, MAX_DOCUMENT_SIZE_BYTES, Role } from '@law-firm/shared';
import { CurrentUser, Roles } from '../common/decorators';
import type { RequestUser } from '../common/types/request-user';
import type { UploadedFile } from '../documents/documents.service';
import { DocumentRequestsService } from './document-requests.service';
import {
  CreateDocumentRequestDto,
  DocumentRequestQueryDto,
  ReviewDocumentRequestDto,
  UpdateDocumentRequestDto,
} from './dto/document-requests.dto';

@ApiTags('document-requests')
@ApiBearerAuth()
@Controller()
export class DocumentRequestsController {
  constructor(private readonly requests: DocumentRequestsService) {}

  @Get('cases/:caseId/document-requests')
  @ApiOperation({ summary: 'Хэргийн баримтын хүсэлтүүд, хавсаргасан файлтай нь (role бүр өөрийн scope-оор)' })
  findByCase(@Param('caseId') caseId: string, @Query() query: DocumentRequestQueryDto, @CurrentUser() user: RequestUser) {
    return this.requests.findByCase(caseId, query, user);
  }

  @Roles(Role.ADMIN, Role.LAWYER)
  @Post('cases/:caseId/document-requests')
  @ApiOperation({ summary: '[ADMIN, хариуцсан LAWYER] Нэг эсвэл олон баримт хүсэх; харилцагчид мэдэгдэл очно' })
  create(@Param('caseId') caseId: string, @Body() dto: CreateDocumentRequestDto, @CurrentUser() user: RequestUser) {
    return this.requests.create(caseId, dto, user);
  }

  @Get('document-requests/summary')
  @ApiOperation({ summary: 'Хүлээгдэж буй хүсэлтийн тоо хэргээр (CLIENT → PENDING+REJECTED, ажилтан → SUBMITTED+UNDER_REVIEW)' })
  summary(@CurrentUser() user: RequestUser) {
    return this.requests.summary(user);
  }

  @Roles(Role.ADMIN, Role.LAWYER)
  @Patch('document-requests/:id')
  @ApiOperation({ summary: '[ADMIN, хариуцсан LAWYER] Хүсэлт засах (зөвхөн PENDING эсвэл REJECTED үед)' })
  update(@Param('id') id: string, @Body() dto: UpdateDocumentRequestDto, @CurrentUser() user: RequestUser) {
    return this.requests.update(id, dto, user);
  }

  @Roles(Role.ADMIN, Role.LAWYER)
  @Delete('document-requests/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '[ADMIN, хариуцсан LAWYER] Хүсэлт устгах (файл хавсрагдаагүй бол)' })
  remove(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.requests.remove(id, user);
  }

  @Roles(Role.CLIENT)
  @Post('document-requests/:id/submit')
  @UseInterceptors(FilesInterceptor('files', MAX_DOCUMENT_REQUEST_FILES, { limits: { fileSize: MAX_DOCUMENT_SIZE_BYTES } }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { files: { type: 'array', items: { type: 'string', format: 'binary' } } },
    },
  })
  @ApiOperation({ summary: '[CLIENT, өөрийн хэрэг] Хүсэлтэд файл(ууд) илгээх → SUBMITTED; хуульчид мэдэгдэл очно' })
  submit(@Param('id') id: string, @UploadedFiles() files: UploadedFile[] | undefined, @CurrentUser() user: RequestUser) {
    return this.requests.submit(id, files, user);
  }

  @Roles(Role.ADMIN, Role.LAWYER)
  @Post('document-requests/:id/review')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[ADMIN, хариуцсан LAWYER] UNDER_REVIEW | APPROVED | REJECTED (шалтгаантай); харилцагчид мэдэгдэл очно' })
  review(@Param('id') id: string, @Body() dto: ReviewDocumentRequestDto, @CurrentUser() user: RequestUser) {
    return this.requests.review(id, dto, user);
  }
}
