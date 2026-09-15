import { Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators';
import type { RequestUser } from '../common/types/request-user';
import { NotificationListQueryDto } from './dto/notifications.dto';
import { NotificationsService } from './notifications.service';

/** No @Roles: CLIENT, LAWYER and ADMIN all use these routes, always for their own notifications only. */
@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Миний мэдэгдлүүд: шинэ нь эхэндээ, filter=all|unread|read, cursor + limit (≤50), уншаагүй тоо, үйлдэл хийсэн хүн' })
  findMine(@Query() query: NotificationListQueryDto, @CurrentUser() user: RequestUser) {
    return this.notifications.findMine(user.id, query);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Уншаагүй мэдэгдлийн тоо (хонхны badge)' })
  async unreadCount(@CurrentUser() user: RequestUser) {
    return { count: await this.notifications.unreadCount(user.id) };
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Бүх мэдэгдлийг уншсан болгох' })
  markAllRead(@CurrentUser() user: RequestUser) {
    return this.notifications.markAllRead(user.id);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Нэг мэдэгдлийг уншсан болгох (өөр хүнийх → 404)' })
  markRead(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.notifications.markRead(id, user.id);
  }
}
