import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  PayloadTooLargeException,
  Post,
  Query,
  UnsupportedMediaTypeException,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@law-firm/shared';
import type { UploadedFile as UploadedFileShape } from '../documents/documents.service';
import { StorageService } from '../storage/storage.service';
import { CurrentUser, Public, Roles } from '../common/decorators';
import type { RequestUser } from '../common/types/request-user';
import { CreatePostDto, PostManageQueryDto, PostQueryDto, UpdatePostDto } from './dto/posts.dto';
import { PostsService } from './posts.service';

const COVER_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_COVER_BYTES = 5 * 1024 * 1024;

@ApiTags('posts')
@Controller('posts')
export class PostsController {
  constructor(
    private readonly posts: PostsService,
    private readonly storage: StorageService,
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Нийтэлсэн нийтлэлүүд (category, search, page, limit)' })
  findPublished(@Query() query: PostQueryDto) {
    return this.posts.findPublished(query);
  }

  @Roles(Role.ADMIN, Role.LAWYER)
  @Get('manage')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Удирдлагын жагсаалт — ноорог, архив орно (LAWYER → өөрийн л)' })
  findForManagement(@Query() query: PostManageQueryDto, @CurrentUser() user: RequestUser) {
    return this.posts.findForManagement(query, user);
  }

  @Roles(Role.ADMIN, Role.LAWYER)
  @Get('manage/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Засварлах нийтлэл (ямар ч төлөв; LAWYER → өөрийн л)' })
  findForManagementById(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.posts.findForManagementById(id, user);
  }

  @Roles(Role.ADMIN, Role.LAWYER)
  @Post('cover')
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_COVER_BYTES } }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @ApiOperation({ summary: 'Нийтлэлийн нүүр зураг оруулах (JPG/PNG/WEBP, 5MB) → нийтэд нээлттэй URL' })
  async uploadCover(@UploadedFile() file: UploadedFileShape | undefined) {
    if (!file) throw new BadRequestException('Зураг сонгоно уу (multipart талбар: "file")');
    if (!COVER_MIME_TYPES.includes(file.mimetype)) {
      throw new UnsupportedMediaTypeException('Зөвхөн JPG, PNG, WEBP зураг оруулах боломжтой');
    }
    if (file.size > MAX_COVER_BYTES) throw new PayloadTooLargeException('Зургийн хэмжээ 5MB-аас хэтэрч болохгүй');
    const ext = extname(Buffer.from(file.originalname, 'latin1').toString('utf8')).toLowerCase() || '.jpg';
    const url = await this.storage.uploadPublic({ key: `posts/${randomUUID()}${ext}`, body: file.buffer, mimeType: file.mimetype, size: file.size });
    return { url };
  }

  @Public()
  @Get(':slug')
  @ApiOperation({ summary: 'Нийтлэлийн дэлгэрэнгүй (slug) — viewCount нэмэгдэнэ' })
  findBySlug(@Param('slug') slug: string) {
    return this.posts.findPublishedBySlug(slug);
  }

  @Roles(Role.ADMIN, Role.LAWYER)
  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Нийтлэл үүсгэх' })
  create(@Body() dto: CreatePostDto, @CurrentUser() user: RequestUser) {
    return this.posts.create(dto, user);
  }

  @Roles(Role.ADMIN, Role.LAWYER)
  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Нийтлэл засах (LAWYER → зөвхөн өөрийнх)' })
  update(@Param('id') id: string, @Body() dto: UpdatePostDto, @CurrentUser() user: RequestUser) {
    return this.posts.update(id, dto, user);
  }

  @Roles(Role.ADMIN, Role.LAWYER)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Нийтлэл устгах' })
  remove(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.posts.remove(id, user);
  }
}
