import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { TEST_ROLE_HEADER, createGuardedApp } from '../common/testing/http';
import { InvoicePaymentsController } from './invoice-payments.controller';
import { InvoicePaymentsService } from './invoice-payments.service';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';

const UUID = '3f1c2b6e-8a4d-4c1e-9b2f-5d6e7a8b9c0d';

describe('Invoice payment endpoints (role guard + validation over HTTP)', () => {
  let app: INestApplication;
  const payments = { summary: jest.fn(), markPaid: jest.fn(), confirm: jest.fn(), reject: jest.fn() };
  const invoices = { findAll: jest.fn(), findOne: jest.fn(), create: jest.fn(), update: jest.fn() };

  beforeAll(async () => {
    app = await createGuardedApp({
      controllers: [InvoicePaymentsController, InvoicesController],
      providers: [
        { provide: InvoicePaymentsService, useValue: payments },
        { provide: InvoicesService, useValue: invoices },
      ],
    });
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => jest.clearAllMocks());

  it.each([
    ['LAWYER', `/invoices/${UUID}/mark-paid`, {}],
    ['ADMIN', `/invoices/${UUID}/mark-paid`, {}],
    ['CLIENT', `/invoices/${UUID}/confirm-payment`, {}],
    ['CLIENT', `/invoices/${UUID}/reject-payment`, { reason: 'Дүн зөрсөн' }],
  ] as const)('%s POST %s → 403', async (role, url, body) => {
    const res = await request(app.getHttpServer()).post(url).set(TEST_ROLE_HEADER, role).send(body);
    expect(res.status).toBe(403);
    expect([payments.markPaid, payments.confirm, payments.reject].some((fn) => fn.mock.calls.length > 0)).toBe(false);
  });

  it('reject without a reason → 400 with a Mongolian message', async () => {
    const res = await request(app.getHttpServer()).post(`/invoices/${UUID}/reject-payment`).set(TEST_ROLE_HEADER, 'ADMIN').send({ reason: ' ' });
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).toContain('Татгалзах шалтгааныг бичнэ үү');
    expect(payments.reject).not.toHaveBeenCalled();
  });

  it('mark-paid: the note is optional (200) but limited to 500 characters (400)', async () => {
    payments.markPaid.mockResolvedValue({ id: UUID, status: 'AWAITING_CONFIRMATION' });
    const server = app.getHttpServer();
    expect((await request(server).post(`/invoices/${UUID}/mark-paid`).set(TEST_ROLE_HEADER, 'CLIENT').send({})).status).toBe(200);
    expect(payments.markPaid).toHaveBeenCalledWith(UUID, {}, expect.objectContaining({ role: 'CLIENT' }));
    expect((await request(server).post(`/invoices/${UUID}/mark-paid`).set(TEST_ROLE_HEADER, 'CLIENT').send({ paymentNote: 'ы'.repeat(501) })).status).toBe(400);
  });

  it('GET /invoices/payment-summary is not captured by GET /invoices/:id', async () => {
    payments.summary.mockResolvedValue({ total: 0, invoices: [] });
    const res = await request(app.getHttpServer()).get('/invoices/payment-summary').set(TEST_ROLE_HEADER, 'LAWYER');
    expect(res.status).toBe(200);
    expect(payments.summary).toHaveBeenCalledTimes(1);
    expect(invoices.findOne).not.toHaveBeenCalled();
  });
});
