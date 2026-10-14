import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@law-firm/shared';
import { Roles } from '../common/decorators';
import { MailService } from './mail.service';

/** The admin settings page reads this to see whether e-mail is actually leaving the building. */
@ApiTags('mail')
@ApiBearerAuth()
@Controller('mail')
export class MailController {
  constructor(private readonly mail: MailService) {}

  @Roles(Role.ADMIN)
  @Get('log')
  @ApiOperation({ summary: 'Сүүлийн и-мэйлүүдийн бүртгэл (ADMIN); агуулга хадгалагддаггүй' })
  async log(@Query('limit') limit?: string) {
    const take = Math.min(Math.max(Number(limit) || 50, 1), 200);
    return { enabled: this.mail.enabled, items: await this.mail.recentLog(take) };
  }
}
