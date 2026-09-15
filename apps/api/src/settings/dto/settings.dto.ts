import { createZodDto } from 'nestjs-zod';
import { BankAccountSettingsSchema } from '@law-firm/shared';

export class UpdateBankAccountDto extends createZodDto(BankAccountSettingsSchema) {}
