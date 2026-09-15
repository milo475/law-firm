import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { TEST_ROLE_HEADER, createGuardedApp } from '../common/testing/http';
import { DocumentRequestsController } from './document-requests.controller';
import { DocumentRequestsService } from './document-requests.service';

const UUID = '3f1c2b6e-8a4d-4c1e-9b2f-5d6e7a8b9c0d';

describe('Document request endpoints (role guard + validation over HTTP)', () => {
  let app: INestApplication;
  const service = {
    findByCase: jest.fn(),
    summary: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    submit: jest.fn(),
    review: jest.fn(),
  };

  beforeAll(async () => {
    app = await createGuardedApp({
      controllers: [DocumentRequestsController],
      providers: [{ provide: DocumentRequestsService, useValue: service }],
    });
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => jest.clearAllMocks());

  it.each([
    ['CLIENT', 'post', `/cases/${UUID}/document-requests`, { items: [{ title: 'Иргэний үнэмлэх' }] }],
    ['CLIENT', 'patch', `/document-requests/${UUID}`, { title: 'Өөр нэр' }],
    ['CLIENT', 'delete', `/document-requests/${UUID}`, undefined],
    ['CLIENT', 'post', `/document-requests/${UUID}/review`, { decision: 'APPROVED' }],
    ['LAWYER', 'post', `/document-requests/${UUID}/submit`, undefined],
    ['ADMIN', 'post', `/document-requests/${UUID}/submit`, undefined],
  ] as const)('%s %s %s → 403', async (role, method, url, body) => {
    const req = request(app.getHttpServer())[method](url).set(TEST_ROLE_HEADER, role);
    const res = await (body ? req.send(body) : req);
    expect(res.status).toBe(403);
    expect(Object.values(service).some((fn) => fn.mock.calls.length > 0)).toBe(false);
  });

  it('REJECTED without rejectionReason → 400 with a Mongolian message', async () => {
    const res = await request(app.getHttpServer())
      .post(`/document-requests/${UUID}/review`)
      .set(TEST_ROLE_HEADER, 'LAWYER')
      .send({ decision: 'REJECTED' });
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).toContain('Буцаах шалтгааныг бичнэ үү');
    expect(service.review).not.toHaveBeenCalled();
  });

  it('an empty checklist → 400', async () => {
    const res = await request(app.getHttpServer())
      .post(`/cases/${UUID}/document-requests`)
      .set(TEST_ROLE_HEADER, 'LAWYER')
      .send({ items: [] });
    expect(res.status).toBe(400);
    expect(service.create).not.toHaveBeenCalled();
  });

  it('LAWYER creates requests → 201 with defaults applied and the due date parsed', async () => {
    service.create.mockResolvedValue([{ id: 'req-1' }]);
    const res = await request(app.getHttpServer())
      .post(`/cases/${UUID}/document-requests`)
      .set(TEST_ROLE_HEADER, 'LAWYER')
      .send({ items: [{ title: 'Иргэний үнэмлэхний хуулбар', dueDate: '2026-10-01T00:00:00Z' }] });
    expect(res.status).toBe(201);
    expect(service.create).toHaveBeenCalledWith(
      UUID,
      { items: [{ title: 'Иргэний үнэмлэхний хуулбар', isRequired: true, dueDate: new Date('2026-10-01T00:00:00Z') }] },
      expect.objectContaining({ role: 'LAWYER' }),
    );
  });

  it('CLIENT submits files as multipart "files" → 201', async () => {
    service.submit.mockResolvedValue({ id: UUID, status: 'SUBMITTED' });
    const res = await request(app.getHttpServer())
      .post(`/document-requests/${UUID}/submit`)
      .set(TEST_ROLE_HEADER, 'CLIENT')
      .attach('files', Buffer.from('%PDF-1.4'), 'unemleh.pdf')
      .attach('files', Buffer.from('%PDF-1.4'), 'hulga.pdf');
    expect(res.status).toBe(201);
    expect(service.submit).toHaveBeenCalledWith(
      UUID,
      [expect.objectContaining({ originalname: 'unemleh.pdf' }), expect.objectContaining({ originalname: 'hulga.pdf' })],
      expect.objectContaining({ role: 'CLIENT' }),
    );
  });
});
