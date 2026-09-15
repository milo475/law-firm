import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { TEST_ROLE_HEADER, createGuardedApp } from '../common/testing/http';
import { CaseEventsService } from './case-events.service';
import { CaseEventsController, CasesController } from './cases.controller';
import { CasesService } from './cases.service';

const UUID = '3f1c2b6e-8a4d-4c1e-9b2f-5d6e7a8b9c0d';

describe('Cases & events controllers (role guard over HTTP)', () => {
  let app: INestApplication;
  const cases = { findAll: jest.fn(), findOne: jest.fn(), findEvents: jest.fn(), create: jest.fn(), update: jest.fn(), close: jest.fn() };
  const events = { create: jest.fn(), update: jest.fn(), remove: jest.fn() };

  beforeAll(async () => {
    app = await createGuardedApp({
      controllers: [CasesController, CaseEventsController],
      providers: [
        { provide: CasesService, useValue: cases },
        { provide: CaseEventsService, useValue: events },
      ],
    });
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => jest.clearAllMocks());

  const validCase = { title: 'Цалингийн маргаан', type: 'LABOR', clientId: UUID };
  const validEvent = { type: 'HEARING', title: 'Шүүх хурал', eventDate: '2026-09-24T10:00:00+08:00' };

  it.each([
    ['POST', '/cases', validCase],
    ['PATCH', `/cases/${UUID}`, { status: 'CLOSED' }],
    ['PATCH', `/cases/${UUID}/close`, {}],
    ['POST', `/cases/${UUID}/events`, validEvent],
    ['PATCH', `/events/${UUID}`, { title: 'Өөрчилсөн' }],
    ['DELETE', `/events/${UUID}`, undefined],
  ])('CLIENT %s %s → 403', async (method, url, body) => {
    const req = request(app.getHttpServer())[method.toLowerCase() as 'post' | 'patch' | 'delete'](url).set(TEST_ROLE_HEADER, 'CLIENT');
    const res = await (body ? req.send(body) : req);
    expect(res.status).toBe(403);
    expect(res.body.message).toBe('Энэ үйлдлийг хийх эрх танд байхгүй байна');
    expect([...Object.values(cases), ...Object.values(events)].every((fn) => fn.mock.calls.length === 0)).toBe(true);
  });

  it('LAWYER can POST /cases (201) and the body reaches the service', async () => {
    cases.create.mockResolvedValue({ id: 'new-case' });
    const res = await request(app.getHttpServer()).post('/cases').set(TEST_ROLE_HEADER, 'LAWYER').send(validCase);
    expect(res.status).toBe(201);
    expect(cases.create).toHaveBeenCalledWith(expect.objectContaining({ title: 'Цалингийн маргаан', clientId: UUID }), expect.objectContaining({ role: 'LAWYER' }));
  });

  it('a manual STATUS_CHANGE event is rejected by validation → 400', async () => {
    const res = await request(app.getHttpServer())
      .post(`/cases/${UUID}/events`)
      .set(TEST_ROLE_HEADER, 'LAWYER')
      .send({ ...validEvent, type: 'STATUS_CHANGE' });
    expect(res.status).toBe(400);
    expect(events.create).not.toHaveBeenCalled();
  });

  it('CLIENT can still read their case list (GET /cases → 200)', async () => {
    cases.findAll.mockResolvedValue({ items: [], total: 0, page: 1, limit: 20, totalPages: 1 });
    const res = await request(app.getHttpServer()).get('/cases').set(TEST_ROLE_HEADER, 'CLIENT');
    expect(res.status).toBe(200);
  });
});
