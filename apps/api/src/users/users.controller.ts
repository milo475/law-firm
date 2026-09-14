import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@law-firm/shared';
import { ChangePasswordDto } from '../auth/dto/auth.dto';
import { CurrentUser, Roles } from '../common/decorators';
import type { RequestUser } from '../common/types/request-user';
import { CreateUserDto, UpdateMeDto, UpdateUserDto, UserQueryDto } from './dto/users.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  // Self-service routes must be declared before the `:id` routes.

  @Patch('me')
  @ApiOperation({ summary: 'Өөрийн профайл засах' })
  updateMe(@CurrentUser() user: RequestUser, @Body() dto: UpdateMeDto) {
    return this.users.updateMe(user.id, dto);
  }

  @Patch('me/password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Нууц үг солих (бүх сесс хүчингүй болно)' })
  changePassword(@CurrentUser() user: RequestUser, @Body() dto: ChangePasswordDto) {
    return this.users.changePassword(user.id, dto);
  }

  @Roles(Role.ADMIN)
  @Get()
  @ApiOperation({ summary: '[ADMIN] Хэрэглэгчдийн жагсаалт' })
  findAll(@Query() query: UserQueryDto) {
    return this.users.findAll(query);
  }

  @Roles(Role.ADMIN)
  @Get(':id')
  @ApiOperation({ summary: '[ADMIN] Хэрэглэгчийн дэлгэрэнгүй' })
  findOne(@Param('id') id: string) {
    return this.users.findOne(id);
  }

  @Roles(Role.ADMIN)
  @Post()
  @ApiOperation({ summary: '[ADMIN] Хэрэглэгч үүсгэх (дурын эрхтэй)' })
  create(@Body() dto: CreateUserDto) {
    return this.users.create(dto);
  }

  @Roles(Role.ADMIN)
  @Patch(':id')
  @ApiOperation({ summary: '[ADMIN] Хэрэглэгч засах' })
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.users.update(id, dto);
  }

  @Roles(Role.ADMIN)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '[ADMIN] Хэрэглэгчийг идэвхгүй болгох (soft delete)' })
  remove(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.users.deactivate(id, user.id);
  }
}
