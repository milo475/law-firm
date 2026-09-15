import type { BankAccountSettings } from '@law-firm/shared';

// ЖИШЭЭ данс — ашиглалтад гаргахаас өмнө бодит дансаар солино.
// Бодит болгоход зөвхөн энэ гурван утгыг солиход хангалттай: портал дахь төлбөрийн заавар GET /settings/bank-account-аас уншдаг.
export const BANK_ACCOUNT: BankAccountSettings = {
  bankName: 'Хаан банк',
  accountNumber: '5023118822',
  accountName: 'Тулгуур Хуулийн Фирм ХХН',
};
