import type { BankAccountSettings } from '@law-firm/shared';

/** Setting row key for the invoice payment account. */
export const BANK_ACCOUNT_SETTING_KEY = 'bank-account';

// ЖИШЭЭ данс — ADMIN «Тохиргоо» хуудаснаас бодит данс хадгалах хүртэл портал үүнийг харуулна.
export const DEFAULT_BANK_ACCOUNT: BankAccountSettings = {
  bankName: 'Хаан банк',
  accountNumber: '5023118822',
  accountName: '«Strategy Law Firm» ХХН',
};
