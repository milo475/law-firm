import { z } from 'zod';

/** "5023 1188 22" → "5023118822", "mn12 0005…" → "MN120005…" */
const compactAccountNumber = (value: string) => value.replace(/\s+/g, '').toUpperCase();

/** PUT /settings/bank-account (ADMIN) — the account clients transfer invoice payments to. */
export const BankAccountSettingsSchema = z.object({
  bankName: z
    .string({ message: 'Банкны нэрийг оруулна уу' })
    .trim()
    .min(2, 'Банкны нэрийг оруулна уу')
    .max(100, 'Банкны нэр 100 тэмдэгтээс хэтрэхгүй байна'),
  accountNumber: z
    .string({ message: 'Дансны дугаарыг оруулна уу' })
    .transform(compactAccountNumber)
    .pipe(
      z
        .string()
        .min(1, 'Дансны дугаарыг оруулна уу')
        .regex(/^(\d{6,20}|MN\d{18})$/, 'Дансны дугаар 6–20 оронтой тоо, эсвэл MN-ээр эхэлсэн IBAN байна'),
    ),
  accountName: z
    .string({ message: 'Хүлээн авагчийн нэрийг оруулна уу' })
    .trim()
    .min(2, 'Хүлээн авагчийн нэрийг оруулна уу')
    .max(150, 'Хүлээн авагчийн нэр 150 тэмдэгтээс хэтрэхгүй байна'),
});
export type BankAccountSettingsInput = z.input<typeof BankAccountSettingsSchema>;
export type BankAccountSettings = z.output<typeof BankAccountSettingsSchema>;

/** GET /settings/bank-account — `updatedAt` stays null while the built-in example account is shown. */
export interface BankAccountSettingsResponse extends BankAccountSettings {
  updatedAt: Date | null;
}
