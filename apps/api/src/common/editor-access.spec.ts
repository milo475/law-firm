import { type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../app.module';
import { TEST_ROLE_HEADER, createGuardedApp } from './testing/http';
import { collectControllers, mockDependencies, routesOf, type ApiRoute } from './testing/routes';

/**
 * An EDITOR writes the firm's articles and must reach nothing else. The danger in a new role is
 * not the door you remember to lock, it is the one added next month — so this test does not list
 * the routes it checks. It walks the module graph, asks Nest for every route it registers, and
 * calls each one as an EDITOR. Anything outside the list below has to answer 403, which means a
 * new endpoint is guarded the day it is written or this test fails.
 *
 * A route belongs on the list for one of three reasons, and the comments say which: it is public,
 * it is the editor's own account, or it is the posts work the role exists for.
 */
const EDITOR_MAY_REACH = new Set([
  // Public — these answer the same for everyone, signed in or not.
  'GET /health',
  'POST /auth/login',
  'POST /auth/register',
  'POST /auth/refresh',
  'POST /auth/logout',
  'POST /auth/forgot-password',
  'POST /auth/reset-password',
  'POST /auth/accept-invite',
  'GET /posts',
  'GET /posts/:slug',
  'GET /lawyers',
  'GET /lawyers/:id',
  'GET /settings/firm',
  'GET /testimonials',
  // (POST /service-requests is CLIENT-only, so an editor is turned away there like any other staff.)

  // The editor's own account — their session, their profile, their password, their notifications.
  'GET /auth/me',
  'PATCH /users/me',
  'PATCH /users/me/password',
  'GET /notifications',
  'GET /notifications/unread-count',
  'PATCH /notifications/read-all',
  'PATCH /notifications/:id/read',

  // The job itself: every post, whoever wrote it, including publishing and the cover image.
  'GET /posts/manage',
  'GET /posts/manage/:id',
  'GET /posts/authors',
  'POST /posts',
  'PATCH /posts/:id',
  'DELETE /posts/:id',
  'POST /posts/cover',
]);

describe('EDITOR reaches posts and nothing else', () => {
  let app: INestApplication;
  let routes: ApiRoute[];

  beforeAll(async () => {
    const controllers = collectControllers(AppModule);
    app = await createGuardedApp({ controllers, providers: mockDependencies(controllers) });
    routes = controllers.flatMap(routesOf);
  });

  afterAll(async () => {
    await app?.close();
  });

  it('finds the routes through Nest rather than a hand-written list', () => {
    // A guard against the test quietly passing because it looked at nothing.
    expect(routes.length).toBeGreaterThan(80);
    expect(routes.map((route) => route.key)).toEqual(expect.arrayContaining(['GET /cases', 'POST /posts', 'GET /invoices']));
  });

  it('every route outside the list answers 403', async () => {
    const reached: string[] = [];
    for (const route of routes) {
      if (EDITOR_MAY_REACH.has(route.key)) continue;
      const response = await request(app.getHttpServer())[route.method](route.url).set(TEST_ROLE_HEADER, 'EDITOR');
      if (response.status !== 403) reached.push(`${route.key} → ${response.status}`);
    }
    expect(reached).toEqual([]);
  });

  it('the list has no route that no longer exists', () => {
    const live = new Set(routes.map((route) => route.key));
    expect([...EDITOR_MAY_REACH].filter((key) => !live.has(key))).toEqual([]);
  });

  it('lets the editor through on every route the list promises', async () => {
    // The other direction: a list that quietly forbids what it claims to allow would hide a
    // half-finished role behind a green test.
    const refused: string[] = [];
    for (const route of routes.filter((candidate) => EDITOR_MAY_REACH.has(candidate.key))) {
      const response = await request(app.getHttpServer())[route.method](route.url).set(TEST_ROLE_HEADER, 'EDITOR');
      // The services are stubs here; what matters is that authorization did not stop the call.
      if (response.status === 403) refused.push(route.key);
    }
    expect(refused).toEqual([]);
  });

  it('a signed-out caller still cannot reach the posts work', async () => {
    const response = await request(app.getHttpServer()).get('/posts/manage');
    expect(response.status).toBe(403);
  });
});
