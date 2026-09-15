import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { TEST_ROLE_HEADER, createGuardedApp } from '../common/testing/http';
import { RemindersController } from './reminders.controller';
import { RemindersService } from './reminders.service';

describe('POST /reminders/run', () => {
  let app: INestApplication;
  const reminders = { runDaily: jest.fn() };

  beforeAll(async () => {
    app = await createGuardedApp({ controllers: [RemindersController], providers: [{ provide: RemindersService, useValue: reminders }] });
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => jest.clearAllMocks());

  it.each(['LAWYER', 'CLIENT'])('%s → 403', async (role) => {
    expect((await request(app.getHttpServer()).post('/reminders/run').set(TEST_ROLE_HEADER, role)).status).toBe(403);
    expect(reminders.runDaily).not.toHaveBeenCalled();
  });

  it('ADMIN runs the job now and gets the summary', async () => {
    reminders.runDaily.mockResolvedValue({ tasksOverdue: 1, notifications: 1 });
    const res = await request(app.getHttpServer()).post('/reminders/run').set(TEST_ROLE_HEADER, 'ADMIN');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ tasksOverdue: 1, notifications: 1 });
  });
});
