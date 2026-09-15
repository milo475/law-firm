import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@law-firm/shared';
import { CurrentUser, Roles } from '../common/decorators';
import type { RequestUser } from '../common/types/request-user';
import { CaseMembersService } from './case-members.service';
import { CreateCaseMemberDto, UpdateCaseMemberDto } from './dto/cases.dto';

@ApiTags('cases')
@ApiBearerAuth()
@Roles(Role.ADMIN, Role.LAWYER)
@Controller('cases')
export class CaseMembersController {
  constructor(private readonly members: CaseMembersService) {}

  @Get(':id/members')
  @ApiOperation({ summary: '[ADMIN, хэргийн гишүүн] Хэргийн баг' })
  list(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.members.list(id, user);
  }

  @Get(':id/members/candidates')
  @ApiOperation({ summary: '[ADMIN, ахлах] Багт нэмэх боломжтой идэвхтэй хуульч, админ' })
  candidates(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.members.candidates(id, user);
  }

  @Post(':id/members')
  @ApiOperation({ summary: '[ADMIN, ахлах] Гишүүн нэмэх (role=LEAD бол ахлахыг шилжүүлнэ); нэмэгдсэн хүнд мэдэгдэл' })
  add(@Param('id') id: string, @Body() dto: CreateCaseMemberDto, @CurrentUser() user: RequestUser) {
    return this.members.add(id, dto, user);
  }

  @Patch(':id/members/:userId')
  @ApiOperation({ summary: '[ADMIN, ахлах] Үүрэг солих — LEAD болгох нь ахлахыг шилжүүлнэ' })
  updateRole(@Param('id') id: string, @Param('userId') userId: string, @Body() dto: UpdateCaseMemberDto, @CurrentUser() user: RequestUser) {
    return this.members.updateRole(id, userId, dto, user);
  }

  @Delete(':id/members/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '[ADMIN, ахлах] Гишүүн хасах (ахлахыг хасахгүй)' })
  remove(@Param('id') id: string, @Param('userId') userId: string, @CurrentUser() user: RequestUser) {
    return this.members.remove(id, userId, user);
  }
}
