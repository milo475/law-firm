import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { TEST_ROLE_HEADER, createGuardedApp } from '../common/testing/http';
import { SettingsController } from './settings.controller';

describe('GET /settings/bank-account', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createGuardedApp({ controllers: [SettingsController] });
  });

  afterAll(async () => {
    await app.close();
  });

  it.each(['CLIENT', 'LAWYER', 'ADMIN'])('%s gets the transfer account shown in the payment instructions', async (role) => {
    const res = await request(app.getHttpServer()).get('/settings/bank-account').set(TEST_ROLE_HEADER, role);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ bankName: 'Хаан банк', accountNumber: '5023118822', accountName: 'Тулгуур Хуулийн Фирм ХХН' });
  });
});
