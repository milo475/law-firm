import { Controller, Get, Param, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators';
import type { RequestUser } from '../common/types/request-user';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Миний мэдэгдлүүд (сүүлийн 50) + уншаагүй тоо' })
  findMine(@CurrentUser() user: RequestUser) {
    return this.notifications.findMine(user.id);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Бүх мэдэгдлийг уншсан болгох' })
  markAllRead(@CurrentUser() user: RequestUser) {
    return this.notifications.markAllRead(user.id);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Нэг мэдэгдлийг уншсан болгох' })
  markRead(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.notifications.markRead(id, user.id);
  }
}
