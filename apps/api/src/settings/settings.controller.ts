import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role, type BankAccountSettingsResponse } from '@law-firm/shared';
import { CurrentUser, Roles } from '../common/decorators';
import type { RequestUser } from '../common/types/request-user';
import { UpdateBankAccountDto } from './dto/settings.dto';
import { SettingsService } from './settings.service';

@ApiTags('settings')
@ApiBearerAuth()
@Controller('settings')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get('bank-account')
  @ApiOperation({ summary: 'Нэхэмжлэхийн төлбөр шилжүүлэх данс (нэвтэрсэн бүх хэрэглэгч)' })
  bankAccount(): Promise<BankAccountSettingsResponse> {
    return this.settings.getBankAccount();
  }

  @Roles(Role.ADMIN)
  @Put('bank-account')
  @ApiOperation({ summary: '[ADMIN] Төлбөр хүлээн авах данс солих (порталын төлбөрийн зааварт шууд харагдана)' })
  updateBankAccount(@Body() dto: UpdateBankAccountDto, @CurrentUser() user: RequestUser): Promise<BankAccountSettingsResponse> {
    return this.settings.updateBankAccount(dto, user);
  }
}
