import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Role } from '@law-firm/shared';
import { Public, Roles } from '../common/decorators';
import { ContactService } from './contact.service';
import { ContactQueryDto, ContactRequestDto, UpdateContactDto } from './dto/contact.dto';

@ApiTags('contact')
@Controller('contact')
export class ContactController {
  constructor(private readonly contact: ContactService) {}

  @Public()
  @Post()
  @Throttle({ default: { limit: 5, ttl: 60 * 60 * 1000 } }) // 5 requests / hour / IP
  @ApiOperation({ summary: 'Холбоо барих хүсэлт илгээх (5/цаг/IP)' })
  create(@Body() dto: ContactRequestDto) {
    return this.contact.create(dto);
  }

  @Roles(Role.ADMIN)
  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: '[ADMIN] Холбоо барих хүсэлтүүд' })
  findAll(@Query() query: ContactQueryDto) {
    return this.contact.findAll(query);
  }

  @Roles(Role.ADMIN)
  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: '[ADMIN] Хүсэлтийн төлөв солих (NEW → CONTACTED → CLOSED)' })
  update(@Param('id') id: string, @Body() dto: UpdateContactDto) {
    return this.contact.updateStatus(id, dto.status);
  }
}
