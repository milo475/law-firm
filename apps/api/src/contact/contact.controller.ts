import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@law-firm/shared';
import { Roles } from '../common/decorators';
import { ContactService } from './contact.service';
import { ContactQueryDto } from './dto/contact.dto';

/** Messages from the former public contact form, read-only; new requests go through /service-requests. */
@ApiTags('contact')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('contact')
export class ContactController {
  constructor(private readonly contact: ContactService) {}

  @Get()
  @ApiOperation({ summary: '[ADMIN] Хуучин «Холбоо барих» маягтын хүсэлтүүд (зөвхөн унших; шинэ хүсэлт /service-requests)' })
  findAll(@Query() query: ContactQueryDto) {
    return this.contact.findAll(query);
  }
}
