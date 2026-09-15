import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { TEST_ROLE_HEADER, createGuardedApp } from '../common/testing/http';
import { CaseMembersController } from './case-members.controller';
import { CaseMembersService } from './case-members.service';

const UUID = '3f1c2b6e-8a4d-4c1e-9b2f-5d6e7a8b9c0d';

describe('Case member endpoints (role guard + validation over HTTP)', () => {
  let app: INestApplication;
  const members = { list: jest.fn(), candidates: jest.fn(), add: jest.fn(), updateRole: jest.fn(), remove: jest.fn() };

  beforeAll(async () => {
    app = await createGuardedApp({ controllers: [CaseMembersController], providers: [{ provide: CaseMembersService, useValue: members }] });
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => jest.clearAllMocks());

  it.each([
    ['get', `/cases/${UUID}/members`, undefined],
    ['post', `/cases/${UUID}/members`, { userId: UUID }],
    ['delete', `/cases/${UUID}/members/${UUID}`, undefined],
  ] as const)('CLIENT %s %s → 403', async (method, url, body) => {
    const req = request(app.getHttpServer())[method](url).set(TEST_ROLE_HEADER, 'CLIENT');
    expect((await (body ? req.send(body) : req)).status).toBe(403);
    expect(Object.values(members).some((fn) => fn.mock.calls.length > 0)).toBe(false);
  });

  it('a missing userId or an unknown role → 400 with a Mongolian message', async () => {
    const server = app.getHttpServer();
    const missing = await request(server).post(`/cases/${UUID}/members`).set(TEST_ROLE_HEADER, 'LAWYER').send({});
    expect(missing.status).toBe(400);
    expect(JSON.stringify(missing.body)).toContain('Ажилтнаа сонгоно уу');
    expect((await request(server).post(`/cases/${UUID}/members`).set(TEST_ROLE_HEADER, 'LAWYER').send({ userId: UUID, role: 'OWNER' })).status).toBe(400);
    expect(members.add).not.toHaveBeenCalled();
  });

  it('LAWYER adds a member (role defaults to MEMBER) → 201; DELETE → 204', async () => {
    members.add.mockResolvedValue({ id: 'row' });
    const server = app.getHttpServer();
    expect((await request(server).post(`/cases/${UUID}/members`).set(TEST_ROLE_HEADER, 'LAWYER').send({ userId: UUID })).status).toBe(201);
    expect(members.add).toHaveBeenCalledWith(UUID, { userId: UUID, role: 'MEMBER' }, expect.objectContaining({ role: 'LAWYER' }));
    expect((await request(server).delete(`/cases/${UUID}/members/${UUID}`).set(TEST_ROLE_HEADER, 'ADMIN')).status).toBe(204);
  });
});
