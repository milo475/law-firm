import { Logger } from '@nestjs/common';
import { createConfigMock, createPrismaMock, type PrismaMock } from '../common/testing/mocks';
import type { PrismaService } from '../prisma/prisma.service';
import type { SettingsService } from '../settings/settings.service';
import { MailService } from './mail.service';
import type { MailMessage, MailTransport } from './mail.types';

const FIRM = {
  name: '«Strategy Law Firm» ХХК',
  registrationNumber: '1234567',
  phone: '70001199',
  email: 'info@lawfirm.mn',
  address: 'Улаанбаатар хот, Сүхбаатар дүүрэг',
  workingHours: 'Даваа–Баасан 09:00–18:00',
  updatedAt: null,
};

const CONFIGURED = { SMTP_HOST: 'smtp.gmail.com', SMTP_USER: 'info@lawfirm.mn', MAIL_FROM: 'Firm <info@lawfirm.mn>' };

const message: MailMessage = {
  to: 'client@example.mn',
  template: 'passwordReset',
  locale: 'mn',
  userId: 'user-1',
  data: { name: 'Ганбат', url: 'http://localhost:3001/portal/reset-password?token=x', hours: 1 },
};

describe('MailService', () => {
  let prisma: PrismaMock;
  let settings: { getFirm: jest.Mock };

  beforeAll(() => {
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  });

  beforeEach(() => {
    prisma = createPrismaMock();
    prisma.emailLog.create.mockResolvedValue({ id: 'log-1' });
    prisma.user.findUnique.mockResolvedValue({ emailNotifications: true });
    settings = { getFirm: jest.fn().mockResolvedValue(FIRM) };
  });

  const build = (transport: MailTransport | null, overrides = {}) =>
    new MailService(
      createConfigMock({ ...overrides }),
      prisma as unknown as PrismaService,
      settings as unknown as SettingsService,
      transport,
    );

  it('is off until SMTP is configured: nothing is sent, nothing throws', async () => {
    const transport = { send: jest.fn() };
    const service = build(transport);

    await expect(service.send(message)).resolves.toMatchObject({ status: 'SKIPPED', attempts: 0 });
    expect(transport.send).not.toHaveBeenCalled();
    expect(service.enabled).toBe(false);
    expect(prisma.emailLog.create.mock.calls[0][0].data).toMatchObject({ status: 'SKIPPED', template: 'passwordReset' });
  });

  it('retries a failing transport twice and succeeds on the third attempt', async () => {
    const transport = {
      send: jest
        .fn()
        .mockRejectedValueOnce(new Error('ECONNRESET'))
        .mockRejectedValueOnce(new Error('421 try later'))
        .mockResolvedValueOnce(undefined),
    };
    const service = build(transport, CONFIGURED);

    await expect(service.send(message)).resolves.toMatchObject({ status: 'SENT', attempts: 3 });
    expect(transport.send).toHaveBeenCalledTimes(3);
    expect(prisma.emailLog.create.mock.calls[0][0].data).toMatchObject({ status: 'SENT', attempts: 3 });
  });

  it('gives up after three attempts, records the failure and never throws', async () => {
    const transport = { send: jest.fn().mockRejectedValue(new Error('535 bad credentials')) };
    const service = build(transport, CONFIGURED);

    await expect(service.send(message)).resolves.toMatchObject({ status: 'FAILED', attempts: 3 });
    const logged = prisma.emailLog.create.mock.calls[0][0].data;
    expect(logged).toMatchObject({ status: 'FAILED', attempts: 3, error: '535 bad credentials' });
    // The log keeps the recipient and the template, never the message itself.
    expect(Object.keys(logged)).not.toContain('html');
    expect(Object.keys(logged)).not.toContain('body');
  });

  it('a notification is not sent to someone who turned notification e-mails off', async () => {
    const transport = { send: jest.fn() };
    prisma.user.findUnique.mockResolvedValue({ emailNotifications: false });
    const service = build(transport, CONFIGURED);

    await expect(
      service.send({ ...message, template: 'newMessage', data: { name: 'Ганбат', url: 'http://x/portal' } }),
    ).resolves.toMatchObject({ status: 'SKIPPED' });
    expect(transport.send).not.toHaveBeenCalled();
  });

  it('a password reset still goes out to someone who turned notification e-mails off', async () => {
    const transport = { send: jest.fn().mockResolvedValue(undefined) };
    prisma.user.findUnique.mockResolvedValue({ emailNotifications: false });
    const service = build(transport, CONFIGURED);

    await expect(service.send(message)).resolves.toMatchObject({ status: 'SENT' });
    expect(transport.send).toHaveBeenCalledTimes(1);
  });

  it('sends from MAIL_FROM with the subject and both bodies', async () => {
    const transport = { send: jest.fn().mockResolvedValue(undefined) };
    const service = build(transport, { ...CONFIGURED, MAIL_REPLY_TO: 'reply@lawfirm.mn' });

    await service.send(message);

    const sent = transport.send.mock.calls[0][0];
    expect(sent).toMatchObject({ from: 'Firm <info@lawfirm.mn>', to: 'client@example.mn', replyTo: 'reply@lawfirm.mn' });
    expect(sent.subject).toContain('Нууц үг сэргээх');
    expect(sent.html).toContain('<!doctype html>');
    expect(sent.text).toContain('Ганбат');
  });

  it('writes portal links in the reader’s language and admin links without a prefix', () => {
    const service = build(null, { APP_URL: 'https://lawfirm.mn' });
    expect(service.url('/portal/cases/1', 'mn')).toBe('https://lawfirm.mn/portal/cases/1');
    expect(service.url('/portal/cases/1', 'en')).toBe('https://lawfirm.mn/en/portal/cases/1');
    expect(service.url('/admin/testimonials', 'zh')).toBe('https://lawfirm.mn/admin/testimonials');
  });
});
