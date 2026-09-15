import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators';
import type { RequestUser } from '../common/types/request-user';
import { MessageListQueryDto, SendMessageDto } from './dto/messages.dto';
import { MessagesService } from './messages.service';

@ApiTags('messages')
@ApiBearerAuth()
@Controller()
export class MessagesController {
  constructor(private readonly messages: MessagesService) {}

  @Get('cases/:caseId/messages')
  @ApiOperation({ summary: 'Хэргийн мессежүүд, шинэ нь эхэндээ (cursor pagination: ?cursor=<id>&limit=30)' })
  list(@Param('caseId') caseId: string, @Query() query: MessageListQueryDto, @CurrentUser() user: RequestUser) {
    return this.messages.list(caseId, query, user);
  }

  @Post('cases/:caseId/messages')
  @ApiOperation({ summary: 'Мессеж илгээх (ADMIN, хариуцсан LAWYER, хэргийн CLIENT); нөгөө талд мэдэгдэл очно' })
  send(@Param('caseId') caseId: string, @Body() dto: SendMessageDto, @CurrentUser() user: RequestUser) {
    return this.messages.send(caseId, dto, user);
  }

  @Get('cases/:caseId/messages/unread-count')
  @ApiOperation({ summary: 'Тухайн хэрэгт нэвтэрсэн хүний уншаагүй мессежийн тоо' })
  unreadCount(@Param('caseId') caseId: string, @CurrentUser() user: RequestUser) {
    return this.messages.unreadCount(caseId, user);
  }

  @Post('cases/:caseId/messages/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Нөгөө талын уншаагүй мессежийг уншсан болгох (ADMIN үзэгч тул өөрчлөгдөхгүй)' })
  markRead(@Param('caseId') caseId: string, @CurrentUser() user: RequestUser) {
    return this.messages.markRead(caseId, user);
  }

  @Get('messages/unread-summary')
  @ApiOperation({ summary: 'Бүх хэргийн уншаагүй мессежийн тоо, хэргээр' })
  unreadSummary(@CurrentUser() user: RequestUser) {
    return this.messages.unreadSummary(user);
  }

  @Get('messages/conversations')
  @ApiOperation({ summary: 'Inbox: мессежтэй хэрэг бүрийн сүүлийн мессеж, уншаагүй тоо' })
  conversations(@CurrentUser() user: RequestUser) {
    return this.messages.conversations(user);
  }
}
