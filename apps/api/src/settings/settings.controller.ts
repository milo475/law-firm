import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role, type BankAccountSettingsResponse, type FirmSettingsResponse } from '@law-firm/shared';
import { CurrentUser, Public, Roles } from '../common/decorators';
import type { RequestUser } from '../common/types/request-user';
import { UpdateBankAccountDto, UpdateFirmDto } from './dto/settings.dto';
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

  @Public()
  @Get('firm')
  @ApiOperation({ summary: 'Фирмийн мэдээлэл: нэр, регистр, утас, и-мэйл, хаяг, ажлын цаг (нийтийн)' })
  firm(): Promise<FirmSettingsResponse> {
    return this.settings.getFirm();
  }

  @Roles(Role.ADMIN)
  @Put('firm')
  @ApiOperation({ summary: '[ADMIN] Фирмийн мэдээлэл солих (нийтийн сайт, нэвтрэх хуудас, нэхэмжлэхэд харагдана)' })
  updateFirm(@Body() dto: UpdateFirmDto, @CurrentUser() user: RequestUser): Promise<FirmSettingsResponse> {
    return this.settings.updateFirm(dto, user);
  }
}
