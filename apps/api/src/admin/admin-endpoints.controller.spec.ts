import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { TEST_ROLE_HEADER, createGuardedApp } from '../common/testing/http';
import { LawyersController } from '../lawyers/lawyers.controller';
import { LawyersService } from '../lawyers/lawyers.service';
import { PostsController } from '../posts/posts.controller';
import { PostsService } from '../posts/posts.service';
import { StorageService } from '../storage/storage.service';
import { UsersController } from '../users/users.controller';
import { UsersService } from '../users/users.service';
import { AdminController } from './admin.controller';
import { AdminStatsService } from './admin-stats.service';

const UUID = '3f1c2b6e-8a4d-4c1e-9b2f-5d6e7a8b9c0d';

describe('Admin-panel endpoints (role guard over HTTP)', () => {
  let app: INestApplication;
  const stats = { stats: jest.fn() };
  const users = { findAll: jest.fn(), findOne: jest.fn(), create: jest.fn(), update: jest.fn(), deactivate: jest.fn(), updateMe: jest.fn(), changePassword: jest.fn() };
  const lawyers = { findAll: jest.fn(), findOne: jest.fn(), findForStaff: jest.fn(), createProfile: jest.fn(), updateProfile: jest.fn() };
  const posts = { findPublished: jest.fn(), findForManagement: jest.fn(), findForManagementById: jest.fn(), findPublishedBySlug: jest.fn(), create: jest.fn(), update: jest.fn(), remove: jest.fn() };
  const storage = { uploadPublic: jest.fn() };

  beforeAll(async () => {
    app = await createGuardedApp({
      controllers: [AdminController, UsersController, LawyersController, PostsController],
      providers: [
        { provide: AdminStatsService, useValue: stats },
        { provide: UsersService, useValue: users },
        { provide: LawyersService, useValue: lawyers },
        { provide: PostsService, useValue: posts },
        { provide: StorageService, useValue: storage },
      ],
    });
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => jest.clearAllMocks());

  const newUser = { email: 'x@example.mn', firstName: 'Болд', lastName: 'Бат', role: 'CLIENT' };

  it.each([
    ['CLIENT', 'get', '/admin/stats', undefined],
    ['CLIENT', 'get', '/users', undefined],
    ['CLIENT', 'post', '/users', newUser],
    ['LAWYER', 'post', '/users', newUser],
    ['LAWYER', 'patch', `/users/${UUID}`, { isActive: false }],
    ['CLIENT', 'post', `/lawyers/${UUID}/profile`, { title: 'Хуульч' }],
    ['CLIENT', 'get', `/posts/manage/${UUID}`, undefined],
    ['CLIENT', 'post', '/posts/cover', undefined],
  ] as const)('%s %s %s → 403', async (role, method, url, body) => {
    const req = request(app.getHttpServer())[method](url).set(TEST_ROLE_HEADER, role);
    const res = await (body ? req.send(body) : req);
    expect(res.status).toBe(403);
  });

  it('LAWYER can read GET /admin/stats and GET /users (clients)', async () => {
    stats.stats.mockResolvedValue({ role: 'LAWYER', upcomingEvents: [] });
    users.findAll.mockResolvedValue({ items: [], total: 0, page: 1, limit: 20, totalPages: 1 });
    expect((await request(app.getHttpServer()).get('/admin/stats').set(TEST_ROLE_HEADER, 'LAWYER')).status).toBe(200);
    expect((await request(app.getHttpServer()).get('/users').set(TEST_ROLE_HEADER, 'LAWYER')).status).toBe(200);
  });

  it('ADMIN cannot create another ADMIN through POST /users → 400', async () => {
    const res = await request(app.getHttpServer()).post('/users').set(TEST_ROLE_HEADER, 'ADMIN').send({ ...newUser, role: 'ADMIN' });
    expect(res.status).toBe(400);
    expect(users.create).not.toHaveBeenCalled();
  });

  it('the public lawyer list still works without authentication', async () => {
    lawyers.findAll.mockResolvedValue([]);
    const res = await request(app.getHttpServer()).get('/lawyers');
    expect(res.status).toBe(200);
  });

  it('a cover upload that is not an image → 415', async () => {
    const res = await request(app.getHttpServer())
      .post('/posts/cover')
      .set(TEST_ROLE_HEADER, 'LAWYER')
      .attach('file', Buffer.from('plain text'), { filename: 'notes.txt', contentType: 'text/plain' });
    expect(res.status).toBe(415);
    expect(storage.uploadPublic).not.toHaveBeenCalled();
  });
});
