import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { TEST_ROLE_HEADER, createGuardedApp } from '../common/testing/http';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

describe('Notification endpoints (every role, own data, validation over HTTP)', () => {
  let app: INestApplication;
  const notifications = { findMine: jest.fn(), unreadCount: jest.fn(), markRead: jest.fn(), markAllRead: jest.fn() };

  beforeAll(async () => {
    app = await createGuardedApp({ controllers: [NotificationsController], providers: [{ provide: NotificationsService, useValue: notifications }] });
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    notifications.findMine.mockResolvedValue({ items: [], unreadCount: 0, nextCursor: null });
  });

  it.each(['ADMIN', 'LAWYER', 'CLIENT'])('%s lists their own notifications with the default page', async (role) => {
    const res = await request(app.getHttpServer()).get('/notifications').set(TEST_ROLE_HEADER, role);
    expect(res.status).toBe(200);
    expect(notifications.findMine).toHaveBeenCalledWith(`${role.toLowerCase()}-id`, { filter: 'all', limit: 50 });
  });

  it('filter, cursor and limit are parsed; unread-count is its own route', async () => {
    notifications.unreadCount.mockResolvedValue(7);
    const server = app.getHttpServer();
    const cursor = '3f1c2b6e-8a4d-4c1e-9b2f-5d6e7a8b9c0d';
    expect((await request(server).get(`/notifications?filter=unread&limit=10&cursor=${cursor}`).set(TEST_ROLE_HEADER, 'LAWYER')).status).toBe(200);
    expect(notifications.findMine).toHaveBeenCalledWith('lawyer-id', { filter: 'unread', limit: 10, cursor });

    const count = await request(server).get('/notifications/unread-count').set(TEST_ROLE_HEADER, 'LAWYER');
    expect(count.body).toEqual({ count: 7 });
    expect(notifications.unreadCount).toHaveBeenCalledWith('lawyer-id');
  });

  it.each([
    ['filter=mine', 'Шүүлтүүр буруу байна'],
    ['limit=500', ''],
    ['cursor=not-a-uuid', 'cursor буруу байна'],
  ])('invalid query %s → 400', async (query, message) => {
    const res = await request(app.getHttpServer()).get(`/notifications?${query}`).set(TEST_ROLE_HEADER, 'ADMIN');
    expect(res.status).toBe(400);
    if (message) expect(JSON.stringify(res.body)).toContain(message);
    expect(notifications.findMine).not.toHaveBeenCalled();
  });

  it('read and read-all act for the signed-in user only', async () => {
    notifications.markRead.mockResolvedValue({ id: 'n1', isRead: true });
    notifications.markAllRead.mockResolvedValue({ updated: 2 });
    const server = app.getHttpServer();
    expect((await request(server).patch('/notifications/n1/read').set(TEST_ROLE_HEADER, 'LAWYER')).status).toBe(200);
    expect(notifications.markRead).toHaveBeenCalledWith('n1', 'lawyer-id');
    const all = await request(server).patch('/notifications/read-all').set(TEST_ROLE_HEADER, 'ADMIN');
    expect(all.body).toEqual({ updated: 2 });
    expect(notifications.markAllRead).toHaveBeenCalledWith('admin-id');
  });
});
