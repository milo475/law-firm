import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { TEST_ROLE_HEADER, createGuardedApp } from '../common/testing/http';
import { ContactController } from '../contact/contact.controller';
import { ContactService } from '../contact/contact.service';
import { DocumentsController } from '../documents/documents.controller';
import { DocumentsService } from '../documents/documents.service';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';

const UUID = '3f1c2b6e-8a4d-4c1e-9b2f-5d6e7a8b9c0d';

describe('Invoice / document / contact staff endpoints (role guard over HTTP)', () => {
  let app: INestApplication;
  const invoices = { findAll: jest.fn(), findOne: jest.fn(), create: jest.fn(), update: jest.fn() };
  const documents = { findByCase: jest.fn(), upload: jest.fn(), downloadUrl: jest.fn(), remove: jest.fn() };
  const contact = { create: jest.fn(), findAll: jest.fn(), updateStatus: jest.fn() };

  beforeAll(async () => {
    app = await createGuardedApp({
      controllers: [InvoicesController, DocumentsController, ContactController],
      providers: [
        { provide: InvoicesService, useValue: invoices },
        { provide: DocumentsService, useValue: documents },
        { provide: ContactService, useValue: contact },
      ],
    });
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => jest.clearAllMocks());

  it.each([
    ['CLIENT', 'post', '/invoices', { caseId: UUID, amount: 1000, description: 'Зөвлөгөө', dueDate: '2026-10-01T00:00:00Z' }],
    ['CLIENT', 'patch', `/invoices/${UUID}`, { status: 'PAID' }],
    ['CLIENT', 'delete', `/documents/${UUID}`, undefined],
    ['CLIENT', 'get', '/contact', undefined],
    ['CLIENT', 'patch', `/contact/${UUID}`, { status: 'CLOSED' }],
    ['LAWYER', 'patch', `/contact/${UUID}`, { status: 'CLOSED' }],
  ] as const)('%s %s %s → 403', async (role, method, url, body) => {
    const req = request(app.getHttpServer())[method](url).set(TEST_ROLE_HEADER, role);
    const res = await (body ? req.send(body) : req);
    expect(res.status).toBe(403);
  });

  it('an invoice amount with 3 decimals is rejected → 400', async () => {
    const res = await request(app.getHttpServer())
      .post('/invoices')
      .set(TEST_ROLE_HEADER, 'LAWYER')
      .send({ caseId: UUID, amount: 1000.555, description: 'Зөвлөгөө', dueDate: '2026-10-01T00:00:00Z' });
    expect(res.status).toBe(400);
    expect(invoices.create).not.toHaveBeenCalled();
  });

  it('ADMIN can PATCH /contact/:id (200)', async () => {
    contact.updateStatus.mockResolvedValue({ id: UUID, status: 'CONTACTED' });
    const res = await request(app.getHttpServer()).patch(`/contact/${UUID}`).set(TEST_ROLE_HEADER, 'ADMIN').send({ status: 'CONTACTED' });
    expect(res.status).toBe(200);
    expect(contact.updateStatus).toHaveBeenCalledWith(UUID, 'CONTACTED');
  });
});
