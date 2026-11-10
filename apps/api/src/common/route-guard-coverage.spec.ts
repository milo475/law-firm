import { AppModule } from '../app.module';
import { apiRoutes } from './testing/routes';

/**
 * Why eighteen routes once carried no `@Roles`: nothing asked them to. A handler with no metadata
 * is reachable by anyone with a session, and that reads as a deliberate decision only because the
 * service behind it happened to scope the answer — which is a property of the service, not of the
 * route, and which the next handler written in a hurry will not inherit.
 *
 * So every route now has to say who it is for, in one of three ways, and this test is what asks:
 *   - `@Roles(...)` — the roles, named one by one;
 *   - `@Public()` — open to anyone, signed in or not;
 *   - the list below — signed in, and the handler answers about the caller themselves.
 *
 * The list is short on purpose. Adding to it is a decision someone makes in a review, with the
 * reason written beside it; forgetting to decide is what now fails.
 */
const OWN_ACCOUNT_ONLY = new Map<string, string>([
  ['GET /auth/me', 'The session answering about itself.'],
  ['PATCH /users/me', 'Own profile; UpdateMeSchema has no role field, so nobody promotes themselves.'],
  ['PATCH /users/me/password', 'Own password, checked against the current one.'],
  ['GET /notifications', 'Own notifications — the service scopes by recipient id.'],
  ['GET /notifications/unread-count', 'Own unread count.'],
  ['PATCH /notifications/read-all', 'Own notifications.'],
  ['PATCH /notifications/:id/read', "Own notification; someone else's id answers 404."],
]);

describe('every route says who it is for', () => {
  const routes = apiRoutes(AppModule);

  it('reads the routing table from Nest, not from a list', () => {
    expect(routes.length).toBeGreaterThan(80);
  });

  it('no route is left to whoever happens to be signed in', () => {
    const undeclared = routes
      .filter((route) => route.roles.length === 0 && !route.isPublic && !OWN_ACCOUNT_ONLY.has(route.key))
      .map((route) => `${route.key} (${route.controller.name})`);

    expect(undeclared).toEqual([]);
  });

  it('the own-account list has no route that no longer exists', () => {
    const live = new Set(routes.map((route) => route.key));
    expect([...OWN_ACCOUNT_ONLY.keys()].filter((key) => !live.has(key))).toEqual([]);
  });

  it('a public route never also names roles', () => {
    // Both at once means one of them is a mistake: @Public skips the JWT guard, so the roles
    // would be checked against a request with no user and refuse everyone.
    expect(routes.filter((route) => route.isPublic && route.roles.length > 0).map((route) => route.key)).toEqual([]);
  });
});
