import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { BankAccountSettingsSchema, type BankAccountSettings, type BankAccountSettingsResponse } from '@law-firm/shared';
import type { RequestUser } from '../common/types/request-user';
import { PrismaService } from '../prisma/prisma.service';
import { BANK_ACCOUNT_SETTING_KEY, DEFAULT_BANK_ACCOUNT } from './bank-account';

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** The saved account, or the built-in example (updatedAt null) until an ADMIN saves one. */
  async getBankAccount(): Promise<BankAccountSettingsResponse> {
    const row = await this.prisma.setting.findUnique({ where: { key: BANK_ACCOUNT_SETTING_KEY }, select: { value: true, updatedAt: true } });
    if (!row) return { ...DEFAULT_BANK_ACCOUNT, updatedAt: null };
    const parsed = BankAccountSettingsSchema.safeParse(row.value);
    if (!parsed.success) {
      // Never fall back to the example account here: clients would transfer money to the wrong place.
      this.logger.error(`Setting "${BANK_ACCOUNT_SETTING_KEY}" holds an invalid value`);
      throw new InternalServerErrorException('Дансны тохиргоо буруу хадгалагдсан байна. Админ «Тохиргоо» хуудаснаас дахин хадгална уу.');
    }
    return { ...parsed.data, updatedAt: row.updatedAt };
  }

  /** ADMIN only (controller). Portal payment instructions show the new account on their next load, including invoices already sent. */
  async updateBankAccount(input: BankAccountSettings, user: RequestUser): Promise<BankAccountSettingsResponse> {
    const value: BankAccountSettings = { bankName: input.bankName, accountNumber: input.accountNumber, accountName: input.accountName };
    const row = await this.prisma.setting.upsert({
      where: { key: BANK_ACCOUNT_SETTING_KEY },
      create: { key: BANK_ACCOUNT_SETTING_KEY, value, updatedById: user.id },
      update: { value, updatedById: user.id },
      select: { updatedAt: true },
    });
    return { ...value, updatedAt: row.updatedAt };
  }
}
