import { Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@law-firm/shared';
import { Roles } from '../common/decorators';
import { RemindersService } from './reminders.service';

@ApiTags('reminders')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('reminders')
export class RemindersController {
  constructor(private readonly reminders: RemindersService) {}

  @Post('run')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[ADMIN] Өдөр тутмын сануулгыг одоо ажиллуулах (өнөөдөр сануулсан зүйлд дахин илгээхгүй)' })
  run() {
    return this.reminders.runDaily();
  }
}
