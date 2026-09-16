import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import {
  BankAccountSettingsSchema,
  EXAMPLE_FIRM_SETTINGS,
  FirmSettingsSchema,
  type BankAccountSettings,
  type BankAccountSettingsResponse,
  type FirmSettings,
  type FirmSettingsResponse,
  type Prisma,
} from '@law-firm/shared';
import type { RequestUser } from '../common/types/request-user';
import { PrismaService } from '../prisma/prisma.service';
import { BANK_ACCOUNT_SETTING_KEY, DEFAULT_BANK_ACCOUNT } from './bank-account';

/** Setting row key for the firm details (name, registration number, contacts). */
const FIRM_SETTING_KEY = 'firm';

type Parser<T> = { safeParse: (value: unknown) => { success: true; data: T } | { success: false } };

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** The saved account, or the built-in example (updatedAt null) until an ADMIN saves one. */
  async getBankAccount(): Promise<BankAccountSettingsResponse> {
    // A corrupted row is a 500, never the example account: clients would transfer money to the wrong place.
    const saved = await this.read(BANK_ACCOUNT_SETTING_KEY, BankAccountSettingsSchema, 'Дансны тохиргоо');
    return saved ? { ...saved.value, updatedAt: saved.updatedAt } : { ...DEFAULT_BANK_ACCOUNT, updatedAt: null };
  }

  /** ADMIN only (controller). Portal payment instructions show the new account on their next load, including invoices already sent. */
  async updateBankAccount(input: BankAccountSettings, user: RequestUser): Promise<BankAccountSettingsResponse> {
    const value: BankAccountSettings = { bankName: input.bankName, accountNumber: input.accountNumber, accountName: input.accountName };
    return { ...value, updatedAt: await this.write(BANK_ACCOUNT_SETTING_KEY, value, user) };
  }

  /** Public: the saved firm details, or the example ones (registrationNumber and updatedAt null) until an ADMIN saves them. */
  async getFirm(): Promise<FirmSettingsResponse> {
    const saved = await this.read(FIRM_SETTING_KEY, FirmSettingsSchema, 'Фирмийн мэдээллийн тохиргоо');
    return saved ? { ...saved.value, updatedAt: saved.updatedAt } : EXAMPLE_FIRM_SETTINGS;
  }

  /** ADMIN only (controller). */
  async updateFirm(input: FirmSettings, user: RequestUser): Promise<FirmSettingsResponse> {
    const value: FirmSettings = {
      name: input.name,
      registrationNumber: input.registrationNumber,
      phone: input.phone,
      email: input.email,
      address: input.address,
      workingHours: input.workingHours,
    };
    return { ...value, updatedAt: await this.write(FIRM_SETTING_KEY, value, user) };
  }

  /** A stored value that no longer passes its schema is a 500 telling the ADMIN to save it again. */
  private async read<T>(key: string, schema: Parser<T>, label: string): Promise<{ value: T; updatedAt: Date } | null> {
    const row = await this.prisma.setting.findUnique({ where: { key }, select: { value: true, updatedAt: true } });
    if (!row) return null;
    const parsed = schema.safeParse(row.value);
    if (!parsed.success) {
      this.logger.error(`Setting "${key}" holds an invalid value`);
      throw new InternalServerErrorException(`${label} буруу хадгалагдсан байна. Админ «Тохиргоо» хуудаснаас дахин хадгална уу.`);
    }
    return { value: parsed.data, updatedAt: row.updatedAt };
  }

  private async write(key: string, value: Prisma.InputJsonObject, user: RequestUser): Promise<Date> {
    const row = await this.prisma.setting.upsert({
      where: { key },
      create: { key, value, updatedById: user.id },
      update: { value, updatedById: user.id },
      select: { updatedAt: true },
    });
    return row.updatedAt;
  }
}
