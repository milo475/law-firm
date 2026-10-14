import { USER_LOCALES, type UserLocale } from '@law-firm/shared';
import type { MailTemplate, MailTemplateData } from '../mail.types';
import { renderMail, type MailBrand } from './index';

const BRAND: MailBrand = {
  logoUrl: 'https://lawfirm.mn/brand/logo.png',
  firmName: '«Strategy Law Firm» ХХК',
  firmAddress: 'Улаанбаатар хот, Сүхбаатар дүүрэг, Их тойруу 14',
  firmPhone: '70001199',
};

/**
 * Everything a message must never carry out of the building. Each template is rendered with these
 * spread into its data, so even a caller that hands over a case number or the text of a message
 * cannot get it into an e-mail; the only way that could change is a template that starts printing
 * fields it is not given today, which is exactly what this test is here to catch.
 */
const POISON = {
  caseNumber: 'LF-2026-0001',
  caseTitle: 'Түрээсийн маргаан',
  caseDescription: 'Ажил олгогч гурван сар цалин олгоогүй',
  documentName: 'иргэний-үнэмлэх.pdf',
  messageBody: 'Маргааш шүүх хуралдаана, баримтаа аваад ирээрэй',
  amount: '1 500 000₮',
  invoiceNumber: 'INV-2026-0002',
  clientEmail: 'client1@example.mn',
  clientPhone: '88110001',
  rejectionReason: 'Хуулга бүдэг байна',
};

const DATA: { [K in MailTemplate]: MailTemplateData[K] } = {
  passwordReset: { name: 'Ганбат', url: 'https://lawfirm.mn/portal/reset-password?token=abc', hours: 1 },
  passwordChanged: { name: 'Ганбат', url: 'https://lawfirm.mn/portal/login' },
  clientInvite: { name: 'Ганбат', url: 'https://lawfirm.mn/portal/accept-invite?token=abc', days: 7 },
  newMessage: { name: 'Ганбат', url: 'https://lawfirm.mn/portal/cases/1?tab=messages' },
  documentRequested: { name: 'Ганбат', url: 'https://lawfirm.mn/portal/cases/1?tab=requests' },
  invoiceIssued: { name: 'Ганбат', url: 'https://lawfirm.mn/portal/invoices/1' },
  testimonialPending: { name: 'Энхжаргал', url: 'https://lawfirm.mn/admin/testimonials' },
  dailyDigest: { name: 'Энхжаргал', url: 'https://lawfirm.mn/admin', tasks: 3, invoices: 1, documentRequests: 2 },
};

const TEMPLATES = Object.keys(DATA) as MailTemplate[];

describe('e-mail templates', () => {
  describe.each(TEMPLATES)('%s', (template) => {
    it.each(USER_LOCALES)('carries no case detail in %s', (locale: UserLocale) => {
      const poisoned = { ...DATA[template], ...POISON } as MailTemplateData[typeof template];
      const mail = renderMail(template, locale, poisoned, BRAND);
      const output = `${mail.subject}\n${mail.html}\n${mail.text}`;

      for (const [field, value] of Object.entries(POISON)) {
        expect(`${field}: ${output.includes(value)}`).toBe(`${field}: false`);
      }
    });

    it.each(USER_LOCALES)('greets the reader and links into the portal in %s', (locale: UserLocale) => {
      const mail = renderMail(template, locale, DATA[template], BRAND);

      expect(mail.subject).toContain(BRAND.firmName);
      expect(mail.html).toContain('<!doctype html>');
      // The reader's own name and the link are the whole of what is personal in an e-mail.
      expect(mail.html).toContain(DATA[template].name);
      expect(mail.html).toContain(DATA[template].url);
      expect(mail.text).toContain(DATA[template].url);
      // The firm's own details are in the footer of both bodies.
      expect(mail.html).toContain(BRAND.firmPhone);
      expect(mail.text).toContain(BRAND.firmAddress);
      expect(mail.html).toContain(BRAND.logoUrl);
    });
  });

  it('says in every language why the detail is not in the e-mail', () => {
    for (const locale of USER_LOCALES) {
      const mail = renderMail('newMessage', locale, DATA.newMessage, BRAND);
      expect(mail.text.length).toBeGreaterThan(80);
      expect(mail.html).toMatch(/color-scheme/);
    }
  });

  it('the digest shows counts and nothing else', () => {
    const mail = renderMail('dailyDigest', 'mn', DATA.dailyDigest, BRAND);
    expect(mail.text).toContain('3');
    expect(mail.text).toContain('Даалгавар');
    expect(mail.text).not.toMatch(/LF-\d{4}/);
  });

  it('escapes anything that reaches the HTML, so a name cannot inject markup', () => {
    const mail = renderMail('newMessage', 'mn', { name: '<script>alert(1)</script>', url: 'https://lawfirm.mn/portal' }, BRAND);
    expect(mail.html).not.toContain('<script>');
    expect(mail.html).toContain('&lt;script&gt;');
  });
});
