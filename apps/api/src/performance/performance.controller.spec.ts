import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { TEST_ROLE_HEADER, createGuardedApp } from '../common/testing/http';
import { PerformanceController } from './performance.controller';
import { PerformanceService } from './performance.service';

const UUID = '3f1c2b6e-8a4d-4c1e-9b2f-5d6e7a8b9c0d';

describe('Performance endpoints (roles + validation over HTTP)', () => {
  let app: INestApplication;
  const performance = { overview: jest.fn(), byUser: jest.fn(), userDetail: jest.fn(), timeline: jest.fn() };

  beforeAll(async () => {
    app = await createGuardedApp({ controllers: [PerformanceController], providers: [{ provide: PerformanceService, useValue: performance }] });
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    for (const fn of Object.values(performance)) fn.mockResolvedValue({});
  });

  it.each(['/performance/overview', '/performance/by-user', `/performance/user/${UUID}`, '/performance/timeline'])('CLIENT GET %s → 403', async (url) => {
    expect((await request(app.getHttpServer()).get(url).set(TEST_ROLE_HEADER, 'CLIENT')).status).toBe(403);
    expect(Object.values(performance).some((fn) => fn.mock.calls.length > 0)).toBe(false);
  });

  it('period defaults to this-month; an unknown period → 400 with the reason', async () => {
    const server = app.getHttpServer();
    expect((await request(server).get('/performance/overview').set(TEST_ROLE_HEADER, 'ADMIN')).status).toBe(200);
    expect(performance.overview).toHaveBeenCalledWith(expect.objectContaining({ id: 'admin-id', role: 'ADMIN' }), { period: 'this-month' });

    const bad = await request(server).get('/performance/by-user?period=last-year').set(TEST_ROLE_HEADER, 'LAWYER');
    expect(bad.status).toBe(400);
    expect(JSON.stringify(bad.body)).toContain('Хугацааны хүрээ буруу байна');
    expect(performance.byUser).not.toHaveBeenCalled();
  });

  it('detail and timeline pass the viewer, the person and the period; a malformed timeline userId → 400', async () => {
    const server = app.getHttpServer();
    expect((await request(server).get(`/performance/user/${UUID}?period=all-time`).set(TEST_ROLE_HEADER, 'LAWYER')).status).toBe(200);
    expect(performance.userDetail).toHaveBeenCalledWith(expect.objectContaining({ id: 'lawyer-id' }), UUID, { period: 'all-time' });

    expect((await request(server).get(`/performance/timeline?period=last-30-days&userId=${UUID}`).set(TEST_ROLE_HEADER, 'LAWYER')).status).toBe(200);
    expect(performance.timeline).toHaveBeenCalledWith(expect.objectContaining({ id: 'lawyer-id' }), { period: 'last-30-days', userId: UUID });

    expect((await request(server).get('/performance/timeline?userId=someone').set(TEST_ROLE_HEADER, 'ADMIN')).status).toBe(400);
  });
});
