import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { TEST_ROLE_HEADER, createGuardedApp } from '../common/testing/http';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';

const UUID = '3f1c2b6e-8a4d-4c1e-9b2f-5d6e7a8b9c0d';

describe('Message endpoints (validation over HTTP)', () => {
  let app: INestApplication;
  const service = { list: jest.fn(), send: jest.fn(), unreadCount: jest.fn(), markRead: jest.fn(), unreadSummary: jest.fn(), conversations: jest.fn() };

  beforeAll(async () => {
    app = await createGuardedApp({ controllers: [MessagesController], providers: [{ provide: MessagesService, useValue: service }] });
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => jest.clearAllMocks());

  const post = (body: unknown) => request(app.getHttpServer()).post(`/cases/${UUID}/messages`).set(TEST_ROLE_HEADER, 'CLIENT').send(body as object);

  it.each([
    ['missing body', {}],
    ['only whitespace', { body: '   \n  ' }],
    ['2001 characters', { body: 'а'.repeat(2001) }],
  ])('%s → 400 with a Mongolian message', async (_label, body) => {
    const res = await post(body);
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).toMatch(/Мессежээ бичнэ үү|2000 тэмдэгтээс хэтрэхгүй/);
    expect(service.send).not.toHaveBeenCalled();
  });

  it('exactly 2000 characters are accepted and trimmed text reaches the service → 201', async () => {
    service.send.mockResolvedValue({ id: 'msg-1' });
    const res = await post({ body: `  ${'а'.repeat(2000)}  ` });
    expect(res.status).toBe(201);
    expect(service.send).toHaveBeenCalledWith(UUID, { body: 'а'.repeat(2000) }, expect.objectContaining({ role: 'CLIENT' }));
  });

  it('list query: limit is parsed, defaults to 30 and cannot exceed 100', async () => {
    service.list.mockResolvedValue({ items: [], nextCursor: null });
    const server = app.getHttpServer();

    expect((await request(server).get(`/cases/${UUID}/messages`).set(TEST_ROLE_HEADER, 'LAWYER')).status).toBe(200);
    expect(service.list).toHaveBeenLastCalledWith(UUID, { limit: 30 }, expect.anything());

    expect((await request(server).get(`/cases/${UUID}/messages?limit=5&cursor=${UUID}`).set(TEST_ROLE_HEADER, 'LAWYER')).status).toBe(200);
    expect(service.list).toHaveBeenLastCalledWith(UUID, { limit: 5, cursor: UUID }, expect.anything());

    expect((await request(server).get(`/cases/${UUID}/messages?limit=500`).set(TEST_ROLE_HEADER, 'LAWYER')).status).toBe(400);
    expect((await request(server).get(`/cases/${UUID}/messages?cursor=abc`).set(TEST_ROLE_HEADER, 'LAWYER')).status).toBe(400);
  });

  it('mark-read answers 200 and the summary routes are not captured by :caseId', async () => {
    service.markRead.mockResolvedValue({ updated: 2 });
    service.unreadSummary.mockResolvedValue({ total: 0, cases: [] });
    const server = app.getHttpServer();
    expect((await request(server).post(`/cases/${UUID}/messages/read`).set(TEST_ROLE_HEADER, 'CLIENT')).status).toBe(200);
    const summary = await request(server).get('/messages/unread-summary').set(TEST_ROLE_HEADER, 'CLIENT');
    expect(summary.status).toBe(200);
    expect(service.unreadSummary).toHaveBeenCalledTimes(1);
  });
});
