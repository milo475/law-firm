import type { INestApplication } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import request from 'supertest';
import { IS_PUBLIC_KEY } from '../common/decorators';
import { TEST_ROLE_HEADER, createGuardedApp } from '../common/testing/http';
import { createPrismaMock, type PrismaMock } from '../common/testing/mocks';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';

const VALID = { bankName: 'Голомт банк', accountNumber: '1105 1234 56', accountName: '«Strategy Law Firm» ХХН' };
const FIRM = {
  name: '«Strategy Law Firm» ХХК',
  registrationNumber: '519 0028',
  phone: '+976 7000-1199',
  email: 'Info@LawFirm.MN',
  address: 'Улаанбаатар, Сүхбаатар дүүрэг, Их тойруу 14',
  workingHours: 'Даваа–Баасан 09:00–18:00',
};

describe('SettingsController', () => {
  let app: INestApplication;
  let prisma: PrismaMock;

  beforeAll(async () => {
    prisma = createPrismaMock();
    app = await createGuardedApp({ controllers: [SettingsController], providers: [SettingsService, { provide: PrismaService, useValue: prisma }] });
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.setting.upsert.mockResolvedValue({ updatedAt: new Date('2026-09-15T12:00:00Z') });
  });

  describe('/settings/bank-account', () => {
    it.each(['CLIENT', 'LAWYER', 'ADMIN'])('GET: %s gets the transfer account shown in the payment instructions', async (role) => {
      prisma.setting.findUnique.mockResolvedValue(null);
      const res = await request(app.getHttpServer()).get('/settings/bank-account').set(TEST_ROLE_HEADER, role);
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ bankName: 'Хаан банк', accountNumber: '5023118822', accountName: '«Strategy Law Firm» ХХН', updatedAt: null });
    });

    it('PUT: ADMIN saves the account; spaces in the number are removed', async () => {
      const res = await request(app.getHttpServer()).put('/settings/bank-account').set(TEST_ROLE_HEADER, 'ADMIN').send(VALID);
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ bankName: 'Голомт банк', accountNumber: '1105123456', accountName: '«Strategy Law Firm» ХХН', updatedAt: '2026-09-15T12:00:00.000Z' });
      expect(prisma.setting.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ update: { value: { bankName: 'Голомт банк', accountNumber: '1105123456', accountName: '«Strategy Law Firm» ХХН' }, updatedById: 'admin-id' } }),
      );
    });

    it('PUT: an MN IBAN is accepted and upper-cased', async () => {
      const res = await request(app.getHttpServer())
        .put('/settings/bank-account')
        .set(TEST_ROLE_HEADER, 'ADMIN')
        .send({ ...VALID, accountNumber: 'mn12 0005 0050 2311 8822' });
      expect(res.status).toBe(200);
      expect(res.body.accountNumber).toBe('MN120005005023118822');
    });

    it.each(['LAWYER', 'CLIENT'])('PUT: %s → 403 and nothing is saved', async (role) => {
      const res = await request(app.getHttpServer()).put('/settings/bank-account').set(TEST_ROLE_HEADER, role).send(VALID);
      expect(res.status).toBe(403);
      expect(prisma.setting.upsert).not.toHaveBeenCalled();
    });

    it.each([
      ['letters in the account number', { ...VALID, accountNumber: '5023-ABC' }, 'Дансны дугаар 6–20 оронтой тоо'],
      ['an empty bank name', { ...VALID, bankName: ' ' }, 'Банкны нэрийг оруулна уу'],
      ['a missing account holder', { bankName: VALID.bankName, accountNumber: VALID.accountNumber }, 'Хүлээн авагчийн нэрийг оруулна уу'],
    ])('PUT: %s → 400 with a Mongolian message', async (_label, body, message) => {
      const res = await request(app.getHttpServer()).put('/settings/bank-account').set(TEST_ROLE_HEADER, 'ADMIN').send(body);
      expect(res.status).toBe(400);
      expect(JSON.stringify(res.body)).toContain(message);
      expect(prisma.setting.upsert).not.toHaveBeenCalled();
    });
  });

  describe('/settings/firm', () => {
    it('GET is public (no JWT needed), unlike the bank account', async () => {
      const reflector = new Reflector();
      expect(reflector.get(IS_PUBLIC_KEY, SettingsController.prototype.firm)).toBe(true);
      expect(reflector.get(IS_PUBLIC_KEY, SettingsController.prototype.bankAccount)).toBeUndefined();

      prisma.setting.findUnique.mockResolvedValue(null);
      const res = await request(app.getHttpServer()).get('/settings/firm');
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ name: '«Strategy Law Firm» ХХК', registrationNumber: null, phone: '70001199', updatedAt: null });
    });

    it('PUT: ADMIN saves; the phone and registration number are normalised, the e-mail lower-cased', async () => {
      const res = await request(app.getHttpServer()).put('/settings/firm').set(TEST_ROLE_HEADER, 'ADMIN').send(FIRM);
      expect(res.status).toBe(200);
      const saved = { ...FIRM, registrationNumber: '5190028', phone: '70001199', email: 'info@lawfirm.mn' };
      expect(res.body).toEqual({ ...saved, updatedAt: '2026-09-15T12:00:00.000Z' });
      expect(prisma.setting.upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { key: 'firm' }, update: { value: saved, updatedById: 'admin-id' } }));
    });

    it.each(['LAWYER', 'CLIENT'])('PUT: %s → 403 and nothing is saved', async (role) => {
      const res = await request(app.getHttpServer()).put('/settings/firm').set(TEST_ROLE_HEADER, role).send(FIRM);
      expect(res.status).toBe(403);
      expect(prisma.setting.upsert).not.toHaveBeenCalled();
    });

    it.each([
      ['a 6-digit registration number', { ...FIRM, registrationNumber: '519002' }, 'Регистрийн дугаар 7 оронтой тоо байна'],
      ['a short phone number', { ...FIRM, phone: '7000' }, 'Утасны дугаар 8 оронтой байна'],
      ['an invalid e-mail', { ...FIRM, email: 'not-an-email' }, 'И-мэйл хаяг буруу байна'],
      ['an empty address', { ...FIRM, address: '  ' }, 'Хаягийг оруулна уу'],
    ])('PUT: %s → 400 with a Mongolian message', async (_label, body, message) => {
      const res = await request(app.getHttpServer()).put('/settings/firm').set(TEST_ROLE_HEADER, 'ADMIN').send(body);
      expect(res.status).toBe(400);
      expect(JSON.stringify(res.body)).toContain(message);
      expect(prisma.setting.upsert).not.toHaveBeenCalled();
    });
  });
});
