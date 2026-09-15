import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { BankAccountSettings } from '@law-firm/shared';
import { BANK_ACCOUNT } from './bank-account';

@ApiTags('settings')
@ApiBearerAuth()
@Controller('settings')
export class SettingsController {
  @Get('bank-account')
  @ApiOperation({ summary: 'Нэхэмжлэхийн төлбөр шилжүүлэх данс (нэвтэрсэн бүх хэрэглэгч)' })
  bankAccount(): BankAccountSettings {
    return BANK_ACCOUNT;
  }
}
