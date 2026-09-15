import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@law-firm/shared';
import { CurrentUser, Roles } from '../common/decorators';
import type { RequestUser } from '../common/types/request-user';
import { PerformanceQueryDto, PerformanceTimelineQueryDto } from './dto/performance.dto';
import { PerformanceService } from './performance.service';

@ApiTags('performance')
@ApiBearerAuth()
@Roles(Role.ADMIN, Role.LAWYER)
@Controller('performance')
export class PerformanceController {
  constructor(private readonly performance: PerformanceService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Харагдах хүрээний нэгдсэн тоо (ADMIN → байгууллага, LAWYER → өөрөө + багийн хамтрагчид); period=this-month|last-30-days|all-time' })
  overview(@Query() query: PerformanceQueryDto, @CurrentUser() user: RequestUser) {
    return this.performance.overview(user, query);
  }

  @Get('by-user')
  @ApiOperation({ summary: 'Харагдах хүн бүрийн идэвхтэй, дууссан, хугацаа хэтэрсэн, хугацаандаа %, хэргийн тоо' })
  byUser(@Query() query: PerformanceQueryDto, @CurrentUser() user: RequestUser) {
    return this.performance.byUser(user, query);
  }

  @Get('timeline')
  @ApiOperation({ summary: 'Дууссан даалгавар өдрөөр (энэ сар, 30 хоног) эсвэл сараар (бүх цаг); userId өгвөл тэр хүн' })
  timeline(@Query() query: PerformanceTimelineQueryDto, @CurrentUser() user: RequestUser) {
    return this.performance.timeline(user, query);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Нэг ажилтны дэлгэрэнгүй: үзүүлэлт, төлөв/ач холбогдлын задаргаа, сүүлийн даалгавар (LAWYER багийн бус → 403)' })
  userDetail(@Param('userId') userId: string, @Query() query: PerformanceQueryDto, @CurrentUser() user: RequestUser) {
    return this.performance.userDetail(user, userId, query);
  }
}
