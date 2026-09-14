import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@law-firm/shared';
import { CurrentUser, Public, Roles } from '../common/decorators';
import type { RequestUser } from '../common/types/request-user';
import { CreatePostDto, PostManageQueryDto, PostQueryDto, UpdatePostDto } from './dto/posts.dto';
import { PostsService } from './posts.service';

@ApiTags('posts')
@Controller('posts')
export class PostsController {
  constructor(private readonly posts: PostsService) {}

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
