import { z } from 'zod';
import { EmailSchema } from './common.js';

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

/** "7000 1199", "7000-1199", "+976 70001199" → "70001199" */
const compactPhone = (value: string) => value.replace(/[\s-]/g, '').replace(/^\+976(?=\d{8}$)/, '');

/** PUT /settings/firm (ADMIN) — firm details shown on the public site, the portal sign-in pages and invoices. */
export const FirmSettingsSchema = z.object({
  name: z
    .string({ message: 'Фирмийн нэрийг оруулна уу' })
    .trim()
    .min(2, 'Фирмийн нэрийг оруулна уу')
    .max(150, 'Фирмийн нэр 150 тэмдэгтээс хэтрэхгүй байна'),
  registrationNumber: z
    .string({ message: 'Регистрийн дугаарыг оруулна уу' })
    .transform((value) => value.replace(/\s+/g, ''))
    .pipe(z.string().regex(/^\d{7}$/, 'Регистрийн дугаар 7 оронтой тоо байна')),
  phone: z
    .string({ message: 'Утасны дугаарыг оруулна уу' })
    .transform(compactPhone)
    .pipe(z.string().regex(/^\d{8}$/, 'Утасны дугаар 8 оронтой байна')),
  email: EmailSchema,
  address: z
    .string({ message: 'Хаягийг оруулна уу' })
    .trim()
    .min(5, 'Хаягийг оруулна уу')
    .max(300, 'Хаяг 300 тэмдэгтээс хэтрэхгүй байна'),
  workingHours: z
    .string({ message: 'Ажлын цагийг оруулна уу' })
    .trim()
    .min(3, 'Ажлын цагийг оруулна уу')
    .max(100, 'Ажлын цаг 100 тэмдэгтээс хэтрэхгүй байна'),
});
export type FirmSettingsInput = z.input<typeof FirmSettingsSchema>;
export type FirmSettings = z.output<typeof FirmSettingsSchema>;

/** GET /settings/firm (public) — `registrationNumber` and `updatedAt` stay null until an ADMIN saves the details. */
export interface FirmSettingsResponse extends Omit<FirmSettings, 'registrationNumber'> {
  registrationNumber: string | null;
  updatedAt: Date | null;
}

/** What the public site showed before the details became editable; served until an ADMIN saves real ones. */
export const EXAMPLE_FIRM_SETTINGS: FirmSettingsResponse = {
  name: 'Тулгуур Хуулийн Фирм ХХК',
  registrationNumber: null,
  phone: '70001199',
  email: 'info@tulguur.mn',
  address: 'Улаанбаатар хот, Сүхбаатар дүүрэг, 1-р хороо, Их тойруу 14, Тулгуур төв, 4 давхар',
  workingHours: 'Даваа–Баасан 09:00–18:00',
  updatedAt: null,
};
