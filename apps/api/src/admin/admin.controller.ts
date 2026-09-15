import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@law-firm/shared';
import { CurrentUser, Roles } from '../common/decorators';
import type { RequestUser } from '../common/types/request-user';
import { AdminStatsService } from './admin-stats.service';

@ApiTags('admin')
@ApiBearerAuth()
@Roles(Role.ADMIN, Role.LAWYER)
@Controller('admin')
export class AdminController {
  constructor(private readonly stats: AdminStatsService) {}

  @Get('stats')
  @ApiOperation({ summary: '[ADMIN, LAWYER] Хянах самбарын статистик (эрхээс хамаарна)' })
  getStats(@CurrentUser() user: RequestUser) {
    return this.stats.stats(user);
  }
}
