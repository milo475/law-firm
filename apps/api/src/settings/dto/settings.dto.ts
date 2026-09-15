import { createZodDto } from 'nestjs-zod';
import { BankAccountSettingsSchema, FirmSettingsSchema } from '@law-firm/shared';

export class UpdateBankAccountDto extends createZodDto(BankAccountSettingsSchema) {}
export class UpdateFirmDto extends createZodDto(FirmSettingsSchema) {}
