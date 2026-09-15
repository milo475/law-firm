import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { TEST_ROLE_HEADER, createGuardedApp } from '../common/testing/http';
import { TaskAttachmentsController } from './task-attachments.controller';
import { TaskAttachmentsService } from './task-attachments.service';

const UUID = '3f1c2b6e-8a4d-4c1e-9b2f-5d6e7a8b9c0d';

describe('Task attachment endpoints (roles + multipart over HTTP)', () => {
  let app: INestApplication;
  const attachments = { list: jest.fn(), upload: jest.fn(), downloadUrl: jest.fn(), remove: jest.fn() };

  beforeAll(async () => {
    app = await createGuardedApp({ controllers: [TaskAttachmentsController], providers: [{ provide: TaskAttachmentsService, useValue: attachments }] });
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    for (const fn of Object.values(attachments)) fn.mockResolvedValue({});
  });

  it.each([
    ['get', `/tasks/${UUID}/attachments`],
    ['post', `/tasks/${UUID}/attachments`],
    ['get', `/task-attachments/${UUID}/download`],
    ['delete', `/task-attachments/${UUID}`],
  ] as const)('CLIENT %s %s → 403', async (method, url) => {
    expect((await request(app.getHttpServer())[method](url).set(TEST_ROLE_HEADER, 'CLIENT')).status).toBe(403);
    expect(Object.values(attachments).some((fn) => fn.mock.calls.length > 0)).toBe(false);
  });

  it('a multipart upload reaches the service with the file and the optional name; DELETE → 204', async () => {
    const server = app.getHttpServer();
    const res = await request(server)
      .post(`/tasks/${UUID}/attachments`)
      .set(TEST_ROLE_HEADER, 'LAWYER')
      .field('name', 'Шинжээчийн дүгнэлт')
      .attach('file', Buffer.from('%PDF-1.4'), { filename: 'dugnelt.pdf', contentType: 'application/pdf' });
    expect(res.status).toBe(201);
    const [taskId, uploaded, dto, user] = attachments.upload.mock.calls[0];
    expect([taskId, uploaded.originalname, uploaded.mimetype, dto, user.id]).toEqual([UUID, 'dugnelt.pdf', 'application/pdf', { name: 'Шинжээчийн дүгнэлт' }, 'lawyer-id']);
    expect((await request(server).delete(`/task-attachments/${UUID}`).set(TEST_ROLE_HEADER, 'ADMIN')).status).toBe(204);
  });
});
