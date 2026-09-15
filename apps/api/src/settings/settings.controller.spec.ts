import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { TEST_ROLE_HEADER, createGuardedApp } from '../common/testing/http';
import { createPrismaMock, type PrismaMock } from '../common/testing/mocks';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';

const VALID = { bankName: 'Голомт банк', accountNumber: '1105 1234 56', accountName: 'Тулгуур Хуулийн Фирм ХХН' };

describe('/settings/bank-account', () => {
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

  it.each(['CLIENT', 'LAWYER', 'ADMIN'])('GET: %s gets the transfer account shown in the payment instructions', async (role) => {
    prisma.setting.findUnique.mockResolvedValue(null);
    const res = await request(app.getHttpServer()).get('/settings/bank-account').set(TEST_ROLE_HEADER, role);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ bankName: 'Хаан банк', accountNumber: '5023118822', accountName: 'Тулгуур Хуулийн Фирм ХХН', updatedAt: null });
  });

  it('PUT: ADMIN saves the account; spaces in the number are removed', async () => {
    const res = await request(app.getHttpServer()).put('/settings/bank-account').set(TEST_ROLE_HEADER, 'ADMIN').send(VALID);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ bankName: 'Голомт банк', accountNumber: '1105123456', accountName: 'Тулгуур Хуулийн Фирм ХХН', updatedAt: '2026-09-15T12:00:00.000Z' });
    expect(prisma.setting.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ update: { value: { bankName: 'Голомт банк', accountNumber: '1105123456', accountName: 'Тулгуур Хуулийн Фирм ХХН' }, updatedById: 'admin-id' } }),
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
