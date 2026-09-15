import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { TEST_ROLE_HEADER, createGuardedApp } from '../common/testing/http';
import { ServiceRequestsController } from './service-requests.controller';
import { ServiceRequestsService } from './service-requests.service';

const VALID = {
  type: 'CONSULTATION',
  caseType: 'LABOR',
  title: 'Ажлаас үндэслэлгүй халагдсан',
  description: 'Ажил олгогч ямар ч мэдэгдэлгүйгээр гэрээг цуцалсан, нөхөн олговор авах боломжтой юу?',
};
const LEAD = '0b8a7f62-3a7d-4b8e-9d3e-1c2b3a4d5e6f';
const MEMBER = '6f1e2d3c-4b5a-4c6d-8e7f-0a1b2c3d4e5f';

describe('ServiceRequestsController (roles and validation)', () => {
  let app: INestApplication;
  const service = {
    create: jest.fn(),
    findAll: jest.fn(),
    summary: jest.fn(),
    findMine: jest.fn(),
    findOne: jest.fn(),
    suggestedLawyers: jest.fn(),
    accept: jest.fn(),
    reject: jest.fn(),
    assign: jest.fn(),
  };

  beforeAll(async () => {
    app = await createGuardedApp({ controllers: [ServiceRequestsController], providers: [{ provide: ServiceRequestsService, useValue: service }] });
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    Object.values(service).forEach((fn) => fn.mockReset().mockResolvedValue({ id: 'sr-1' }));
  });

  const http = () => request(app.getHttpServer());

  it('POST as CLIENT → 201 and the request is created for the caller', async () => {
    const res = await http().post('/service-requests').set(TEST_ROLE_HEADER, 'CLIENT').send(VALID);
    expect(res.status).toBe(201);
    expect(service.create).toHaveBeenCalledWith(expect.objectContaining(VALID), expect.objectContaining({ id: 'client-id', role: 'CLIENT' }));
  });

  it.each(['LAWYER', 'ADMIN'])('POST as %s → 403 (only clients ask for a lawyer)', async (role) => {
    const res = await http().post('/service-requests').set(TEST_ROLE_HEADER, role).send(VALID);
    expect(res.status).toBe(403);
    expect(service.create).not.toHaveBeenCalled();
  });

  it.each([
    ['accept', {}],
    ['reject', { rejectionReason: 'Манай чиглэл биш байна' }],
    ['assign', { lawyerId: LEAD }],
  ])('CLIENT POST /service-requests/:id/%s → 403', async (action, body) => {
    const res = await http().post(`/service-requests/sr-1/${action}`).set(TEST_ROLE_HEADER, 'CLIENT').send(body);
    expect(res.status).toBe(403);
    expect(service[action as 'accept' | 'reject' | 'assign']).not.toHaveBeenCalled();
  });

  it('a LAWYER cannot list, open, accept or see suggestions (403) — they join through the case', async () => {
    // Built one at a time: supertest binds and closes a server per request.
    for (const call of [
      () => http().get('/service-requests'),
      () => http().get('/service-requests/sr-1'),
      () => http().get('/service-requests/sr-1/suggested-lawyers'),
      () => http().post('/service-requests/sr-1/accept'),
    ]) {
      expect((await call().set(TEST_ROLE_HEADER, 'LAWYER')).status).toBe(403);
    }
    expect(service.findAll).not.toHaveBeenCalled();
    expect(service.accept).not.toHaveBeenCalled();
  });

  it('GET /service-requests/mine is for clients; admins use the full list and the summary', async () => {
    expect((await http().get('/service-requests/mine').set(TEST_ROLE_HEADER, 'CLIENT')).status).toBe(200);
    expect((await http().get('/service-requests/mine').set(TEST_ROLE_HEADER, 'ADMIN')).status).toBe(403);
    expect((await http().get('/service-requests?status=NEW&type=LAWYER&caseType=CIVIL').set(TEST_ROLE_HEADER, 'ADMIN')).status).toBe(200);
    expect(service.findAll).toHaveBeenCalledWith(expect.objectContaining({ status: 'NEW', type: 'LAWYER', caseType: 'CIVIL', page: 1, limit: 20 }));
    expect((await http().get('/service-requests/summary').set(TEST_ROLE_HEADER, 'ADMIN')).status).toBe(200);
    expect((await http().get('/service-requests/summary').set(TEST_ROLE_HEADER, 'CLIENT')).status).toBe(403);
  });

  it('accept, reject and assign answer 200 for ADMIN', async () => {
    expect((await http().post('/service-requests/sr-1/accept').set(TEST_ROLE_HEADER, 'ADMIN')).status).toBe(200);
    expect((await http().post('/service-requests/sr-1/reject').set(TEST_ROLE_HEADER, 'ADMIN').send({ rejectionReason: 'Манай чиглэл биш байна' })).status).toBe(200);
    expect((await http().post('/service-requests/sr-1/assign').set(TEST_ROLE_HEADER, 'ADMIN').send({ leadId: LEAD, memberIds: [MEMBER] })).status).toBe(200);
    expect(service.assign).toHaveBeenCalledWith('sr-1', { leadId: LEAD, memberIds: [MEMBER] }, expect.objectContaining({ role: 'ADMIN' }));
  });

  it('reject without a reason → 400 and nothing changes', async () => {
    const res = await http().post('/service-requests/sr-1/reject').set(TEST_ROLE_HEADER, 'ADMIN').send({});
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).toContain('Татгалзах шалтгааныг бичнэ үү');
    expect(service.reject).not.toHaveBeenCalled();
  });

  it.each([
    ['both a lawyer and a team', { lawyerId: LEAD, leadId: LEAD, memberIds: [MEMBER] }, 'Нэг өмгөөлөгч эсвэл баг'],
    ['nothing selected', {}, 'Өмгөөлөгч эсвэл баг сонгоно уу'],
    ['a team without members', { leadId: LEAD }, 'Багт дор хаяж нэг гишүүн нэмнэ үү'],
    ['the lead repeated as a member', { leadId: LEAD, memberIds: [LEAD] }, 'Ахлах өмгөөлөгчийг гишүүдэд давхар оруулахгүй'],
  ])('assign with %s → 400', async (_label, body, message) => {
    const res = await http().post('/service-requests/sr-1/assign').set(TEST_ROLE_HEADER, 'ADMIN').send(body);
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).toContain(message);
    expect(service.assign).not.toHaveBeenCalled();
  });

  it('a description shorter than 30 characters → 400 with the Mongolian hint', async () => {
    const res = await http().post('/service-requests').set(TEST_ROLE_HEADER, 'CLIENT').send({ ...VALID, description: 'Туслаач' });
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).toContain('дор хаяж 30 тэмдэгтээр');
    expect(service.create).not.toHaveBeenCalled();
  });
});
