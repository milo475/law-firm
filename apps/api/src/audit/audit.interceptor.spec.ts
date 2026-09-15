import { AuditInterceptor } from './audit.interceptor';

describe('AuditInterceptor.entityFromRoute', () => {
  it.each([
    ['/auth/login', 'auth'],
    ['/auth/refresh', 'auth'],
    ['/posts', 'posts'],
    ['/posts/:id', 'posts'],
    ['/cases/:id/documents', 'documents'],
    ['/cases/:caseId/document-requests', 'document-requests'],
    ['/document-requests/:id/submit', 'document-requests'],
    ['/cases/:caseId/messages', 'messages'],
    ['/cases/:caseId/messages/read', 'messages'],
    ['/notifications/:id/read', 'notifications'],
    ['/notifications/read-all', 'notifications'],
    ['/users/me/password', 'users'],
    ['/contact/:id/status', 'contact'],
  ])('%s → %s', (route, entity) => {
    expect(AuditInterceptor.entityFromRoute(route)).toBe(entity);
  });

  it('extracts the id from a response body or a nested user object', () => {
    expect(AuditInterceptor.idFromBody({ id: 'abc' })).toBe('abc');
    expect(AuditInterceptor.idFromBody({ user: { id: 'u1' } }, 'user')).toBe('u1');
    expect(AuditInterceptor.idFromBody('plain')).toBeNull();
    expect(AuditInterceptor.idFromBody(null)).toBeNull();
  });
});
