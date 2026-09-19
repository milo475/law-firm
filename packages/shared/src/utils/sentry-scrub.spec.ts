import { isReportableStatus, redactText, scrubEvent, type ScrubbableEvent } from './sentry-scrub.js';

describe('redactText', () => {
  it('masks e-mail addresses and Mongolian phone numbers', () => {
    expect(redactText('Холбоо барих: batbayar@example.mn')).toBe('Холбоо барих: [Filtered]');
    expect(redactText('утас 99112233')).toBe('утас [Filtered]');
    expect(redactText('+976 99112233')).toBe('[Filtered]');
  });

  it('leaves ordinary text and ids alone', () => {
    expect(redactText('Хэрэг олдсонгүй')).toBe('Хэрэг олдсонгүй');
    expect(redactText('LF-2026-0001')).toBe('LF-2026-0001');
  });
});

describe('scrubEvent', () => {
  const event = (): ScrubbableEvent => ({
    message: 'Prisma error for batbayar@example.mn',
    request: {
      url: 'https://lawfirm.mn/api/cases?search=Ганбат',
      query_string: 'search=Ганбат',
      cookies: { access_token: 'ey.header.payload' },
      headers: { cookie: 'access_token=ey', authorization: 'Bearer ey', 'user-agent': 'Chrome', 'x-forwarded-for': '10.0.0.1' },
      data: { body: 'Хэргийн дэлгэрэнгүй тайлбар', password: 'Secret123!' },
    },
    user: { id: 'user-1', email: 'batbayar@example.mn', ip_address: '10.0.0.1', username: 'batbayar' },
    extra: {
      caseNumber: 'LF-2026-0001',
      document: { name: 'Гэрээ.pdf', storageKey: 'cases/LF-2026-0001/uuid.pdf', size: 1024 },
      client: { firstName: 'Батбаяр', lastName: 'Дорж', phone: '99112233' },
    },
    exception: { values: [{ type: 'Error', value: 'Failed for batbayar@example.mn / 99112233' }] },
    breadcrumbs: [{ message: 'POST /cases?search=Ганбат for 99112233', data: { email: 'a@b.mn', status: 500 } }],
  });

  it('drops cookies, auth headers, the body and the query string', () => {
    const scrubbed = scrubEvent(event());
    expect(scrubbed.request?.cookies).toBeUndefined();
    expect(scrubbed.request?.headers?.cookie).toBe('[Filtered]');
    expect(scrubbed.request?.headers?.authorization).toBe('[Filtered]');
    expect(scrubbed.request?.headers?.['user-agent']).toBe('Chrome');
    expect(scrubbed.request?.data).toBe('[Filtered]');
    expect(scrubbed.request?.query_string).toBe('[Filtered]');
    expect(scrubbed.request?.url).toBe('https://lawfirm.mn/api/cases');
  });

  it('keeps only the user id', () => {
    expect(scrubEvent(event()).user).toEqual({ id: 'user-1' });
  });

  it('masks client data anywhere in extra, and keeps the case number for triage', () => {
    const extra = scrubEvent(event()).extra as Record<string, Record<string, unknown>>;
    expect(extra.caseNumber).toBe('LF-2026-0001');
    expect(extra.document.name).toBe('[Filtered]');
    expect(extra.document.storageKey).toBe('[Filtered]');
    expect(extra.document.size).toBe(1024);
    expect(extra.client).toEqual({ firstName: '[Filtered]', lastName: '[Filtered]', phone: '[Filtered]' });
  });

  it('redacts e-mails and phone numbers in the message, the exception and breadcrumbs', () => {
    const scrubbed = scrubEvent(event());
    expect(scrubbed.message).toBe('Prisma error for [Filtered]');
    expect(scrubbed.exception?.values?.[0].value).toBe('Failed for [Filtered] / [Filtered]');
    expect(scrubbed.exception?.values?.[0].type).toBe('Error');
    expect(scrubbed.breadcrumbs?.[0].message).toBe('POST /cases?search=Ганбат for [Filtered]');
    expect(scrubbed.breadcrumbs?.[0].data).toEqual({ email: '[Filtered]', status: 500 });
  });

  it('survives an event with nothing in it', () => {
    expect(() => scrubEvent({})).not.toThrow();
  });
});

describe('isReportableStatus', () => {
  it.each([500, 502, 503, undefined])('reports %s', (status) => {
    expect(isReportableStatus(status)).toBe(true);
  });

  it.each([400, 401, 403, 404, 409, 415, 429])('stays quiet about %s', (status) => {
    expect(isReportableStatus(status)).toBe(false);
  });
});
