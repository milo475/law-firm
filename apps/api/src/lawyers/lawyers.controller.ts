import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@law-firm/shared';
import { CurrentUser, Public, Roles } from '../common/decorators';
import type { RequestUser } from '../common/types/request-user';
import { CreateLawyerProfileDto, UpdateLawyerProfileDto } from './dto/lawyers.dto';
import { LawyersService } from './lawyers.service';

@ApiTags('lawyers')
@Controller('lawyers')
export class LawyersController {
  constructor(private readonly lawyers: LawyersService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Хуульчдын нийтийн жагсаалт' })
  findAll() {
    return this.lawyers.findAll();
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Хуульчийн дэлгэрэнгүй (profile id эсвэл user id)' })
  findOne(@Param('id') id: string) {
    return this.lawyers.findOne(id);
  }

  @Roles(Role.ADMIN, Role.LAWYER)
  @Get(':userId/profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: '[ADMIN, өөрөө] Хуульч + профайл (нийтэд нуусан ч харагдана)' })
  findForStaff(@Param('userId') userId: string, @CurrentUser() actor: RequestUser) {
    return this.lawyers.findForStaff(userId, actor);
  }

  @Roles(Role.ADMIN, Role.LAWYER)
  @Post(':userId/profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: '[ADMIN, өөрөө] Хуульчийн профайл үүсгэх' })
  createProfile(@Param('userId') userId: string, @Body() dto: CreateLawyerProfileDto, @CurrentUser() actor: RequestUser) {
    return this.lawyers.createProfile(userId, dto, actor);
  }

  @Roles(Role.ADMIN, Role.LAWYER)
  @Patch(':userId/profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: '[ADMIN, өөрөө] Хуульчийн профайл засах' })
  updateProfile(@Param('userId') userId: string, @Body() dto: UpdateLawyerProfileDto, @CurrentUser() actor: RequestUser) {
    return this.lawyers.updateProfile(userId, dto, actor);
  }
}
