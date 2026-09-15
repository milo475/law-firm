import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { TEST_ROLE_HEADER, createGuardedApp } from '../common/testing/http';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

const UUID = '3f1c2b6e-8a4d-4c1e-9b2f-5d6e7a8b9c0d';

describe('Task endpoints (role guard + validation over HTTP)', () => {
  let app: INestApplication;
  const tasks = { findAll: jest.fn(), mySummary: jest.fn(), findOne: jest.fn(), create: jest.fn(), update: jest.fn(), remove: jest.fn(), addComment: jest.fn() };

  beforeAll(async () => {
    app = await createGuardedApp({ controllers: [TasksController], providers: [{ provide: TasksService, useValue: tasks }] });
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => jest.clearAllMocks());

  it.each([
    ['get', '/tasks', undefined],
    ['get', `/tasks/${UUID}`, undefined],
    ['post', '/tasks', { title: 'Даалгавар', assigneeId: UUID }],
    ['post', `/tasks/${UUID}/comments`, { body: 'Сайн уу' }],
  ] as const)('CLIENT %s %s → 403 (clients never see tasks)', async (method, url, body) => {
    const req = request(app.getHttpServer())[method](url).set(TEST_ROLE_HEADER, 'CLIENT');
    expect((await (body ? req.send(body) : req)).status).toBe(403);
    expect(Object.values(tasks).some((fn) => fn.mock.calls.length > 0)).toBe(false);
  });

  it('create validation: missing assignee or an unknown priority → 400', async () => {
    const server = app.getHttpServer();
    const missing = await request(server).post('/tasks').set(TEST_ROLE_HEADER, 'LAWYER').send({ title: 'Даалгавар' });
    expect(missing.status).toBe(400);
    expect(JSON.stringify(missing.body)).toContain('Гүйцэтгэгчээ сонгоно уу');
    expect((await request(server).post('/tasks').set(TEST_ROLE_HEADER, 'LAWYER').send({ title: 'Даалгавар', assigneeId: UUID, priority: 'SOMEDAY' })).status).toBe(400);
    expect(tasks.create).not.toHaveBeenCalled();
  });

  it('list query is parsed (overdue=true, sort, defaults) and my-summary is not captured by :id', async () => {
    tasks.findAll.mockResolvedValue({ items: [], total: 0 });
    tasks.mySummary.mockResolvedValue({ active: 0, overdue: 0, byStatus: {} });
    const server = app.getHttpServer();

    expect((await request(server).get('/tasks?overdue=true&sort=priority&status=REVIEW').set(TEST_ROLE_HEADER, 'LAWYER')).status).toBe(200);
    expect(tasks.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ overdue: true, sort: 'priority', status: 'REVIEW', page: 1 }),
      expect.objectContaining({ role: 'LAWYER' }),
    );
    expect((await request(server).get('/tasks/my-summary').set(TEST_ROLE_HEADER, 'ADMIN')).status).toBe(200);
    expect(tasks.mySummary).toHaveBeenCalledTimes(1);
    expect(tasks.findOne).not.toHaveBeenCalled();
  });

  it('an empty comment → 400; DELETE → 204', async () => {
    const server = app.getHttpServer();
    expect((await request(server).post(`/tasks/${UUID}/comments`).set(TEST_ROLE_HEADER, 'LAWYER').send({ body: '   ' })).status).toBe(400);
    expect((await request(server).delete(`/tasks/${UUID}`).set(TEST_ROLE_HEADER, 'ADMIN')).status).toBe(204);
  });
});
