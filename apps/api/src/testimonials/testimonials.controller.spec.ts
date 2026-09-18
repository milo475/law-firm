import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { TEST_ROLE_HEADER, createGuardedApp } from '../common/testing/http';
import { AdminTestimonialsController } from './admin-testimonials.controller';
import { TestimonialsController } from './testimonials.controller';
import { TestimonialsService } from './testimonials.service';

const CASE_ID = '0b8a7f62-3a7d-4b8e-9d3e-1c2b3a4d5e6f';
const BODY = 'Хуульч маань хэргийн явц бүрийг тайлбарлаж, шүүх хуралд итгэлтэй төлөөлсөн. Маш их баярлалаа.';
const VALID = { caseId: CASE_ID, body: BODY, rating: 5, consentGiven: true };

describe('TestimonialsController (roles, consent and validation)', () => {
  let app: INestApplication;
  const service = {
    findPublic: jest.fn(),
    findMine: jest.fn(),
    create: jest.fn(),
    revokeConsent: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    createManual: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeAll(async () => {
    app = await createGuardedApp({
      controllers: [TestimonialsController, AdminTestimonialsController],
      providers: [{ provide: TestimonialsService, useValue: service }],
    });
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    Object.values(service).forEach((fn) => fn.mockReset().mockResolvedValue({ id: 't-1' }));
    service.findPublic.mockResolvedValue([]);
  });

  const http = () => request(app.getHttpServer());

  it('GET /testimonials is public and passes the filters through', async () => {
    const res = await http().get('/testimonials?caseType=CIVIL&featured=true&limit=3');
    expect(res.status).toBe(200);
    expect(service.findPublic).toHaveBeenCalledWith(expect.objectContaining({ caseType: 'CIVIL', featured: true, limit: 3 }));
  });

  it('POST as CLIENT → 201 for their own case', async () => {
    const res = await http().post('/testimonials').set(TEST_ROLE_HEADER, 'CLIENT').send(VALID);
    expect(res.status).toBe(201);
    expect(service.create).toHaveBeenCalledWith(expect.objectContaining(VALID), expect.objectContaining({ id: 'client-id', role: 'CLIENT' }));
  });

  it('POST without the consent box → 400, and nothing reaches the service', async () => {
    const res = await http().post('/testimonials').set(TEST_ROLE_HEADER, 'CLIENT').send({ caseId: CASE_ID, body: BODY });
    expect(res.status).toBe(400);
    expect(service.create).not.toHaveBeenCalled();
  });

  it('POST with consentGiven=false → 400', async () => {
    const res = await http().post('/testimonials').set(TEST_ROLE_HEADER, 'CLIENT').send({ ...VALID, consentGiven: false });
    expect(res.status).toBe(400);
    expect(service.create).not.toHaveBeenCalled();
  });

  it('POST with a body shorter than 30 characters → 400', async () => {
    const res = await http().post('/testimonials').set(TEST_ROLE_HEADER, 'CLIENT').send({ ...VALID, body: 'Сайн ажиллалаа' });
    expect(res.status).toBe(400);
    expect(service.create).not.toHaveBeenCalled();
  });

  it.each(['ADMIN', 'LAWYER'])('POST as %s → 403 (only clients write about their own case)', async (role) => {
    const res = await http().post('/testimonials').set(TEST_ROLE_HEADER, role).send(VALID);
    expect(res.status).toBe(403);
    expect(service.create).not.toHaveBeenCalled();
  });

  it('CLIENT can take their consent back', async () => {
    const res = await http().post('/testimonials/t-1/revoke-consent').set(TEST_ROLE_HEADER, 'CLIENT').send({});
    expect(res.status).toBe(200);
    expect(service.revokeConsent).toHaveBeenCalledWith('t-1', expect.objectContaining({ role: 'CLIENT' }));
  });

  it.each([
    ['get', '/admin/testimonials'],
    ['post', '/admin/testimonials'],
    ['patch', '/admin/testimonials/t-1'],
    ['delete', '/admin/testimonials/t-1'],
  ])('CLIENT %s %s → 403', async (method, path) => {
    const res = await (http() as unknown as Record<string, (p: string) => request.Test>)[method](path).set(TEST_ROLE_HEADER, 'CLIENT').send({});
    expect(res.status).toBe(403);
  });

  it.each(['ADMIN', 'LAWYER'])('%s lists every testimonial with the status filter', async (role) => {
    service.findAll.mockResolvedValue({ items: [], total: 0, page: 1, limit: 20, totalPages: 1 });
    const res = await http().get('/admin/testimonials?status=PENDING').set(TEST_ROLE_HEADER, role);
    expect(res.status).toBe(200);
    expect(service.findAll).toHaveBeenCalledWith(expect.objectContaining({ status: 'PENDING' }));
  });

  it('ADMIN publishes through PATCH', async () => {
    const res = await http().patch('/admin/testimonials/t-1').set(TEST_ROLE_HEADER, 'ADMIN').send({ status: 'PUBLISHED' });
    expect(res.status).toBe(200);
    expect(service.update).toHaveBeenCalledWith('t-1', { status: 'PUBLISHED' }, expect.objectContaining({ role: 'ADMIN' }));
  });

  it('PATCH with an empty body → 400', async () => {
    const res = await http().patch('/admin/testimonials/t-1').set(TEST_ROLE_HEADER, 'ADMIN').send({});
    expect(res.status).toBe(400);
    expect(service.update).not.toHaveBeenCalled();
  });
});
