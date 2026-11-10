import { type APIRequestContext, expect, test } from '@playwright/test';
import { API_URL, CLIENT1, CLIENT2, LAWYER1, LAWYER2, apiAs, createCaseForClient1 } from './fixtures';

/**
 * Eighteen routes used to carry no `@Roles` at all and leaned entirely on their service to decide
 * who may see what. They are named now, but the question that matters is older than the EDITOR
 * role: does the scoping inside those services actually hold for a client or a lawyer who asks
 * for somebody else's row?
 *
 * So this does not pick a few interesting cases by hand. It builds one case belonging to CLIENT1 —
 * document, request, message, invoice, event — then reads every route the API registers out of its
 * own OpenAPI document and tries them all twice: as CLIENT2 (another client) and as LAWYER2 (a
 * lawyer who is not on the team). Nothing may answer 2xx, and no list anywhere may so much as
 * mention one of the identifiers.
 */

/**
 * The one door that stays open on purpose. The firm's lawyers share a client directory — a lawyer
 * opens a case for a client they have not met yet — so `/users/:id` is a staff route by design
 * (README §4: "LAWYER зөвхөн CLIENT хэрэглэгчдийг харна"). It is written down here rather than
 * skipped, and the sweep separately proves a CLIENT is still refused the very same route.
 */
const FIRM_WIDE_FOR_STAFF = new Set(['LAWYER2 GET /users/{id}']);

const uniqueId = () => Date.now().toString(36);
const pdf = (name: string) => ({ name, mimeType: 'application/pdf', buffer: Buffer.from(`%PDF-1.4 ${name}`) });

interface Fixture {
  caseId: string;
  caseNumber: string;
  clientId: string;
  documentId: string;
  hiddenDocumentId: string;
  documentName: string;
  requestId: string;
  requestTitle: string;
  invoiceId: string;
  invoiceNumber: string;
  eventId: string;
  eventTitle: string;
  messageBody: string;
  notificationId: string;
}

/** One case belonging to CLIENT1, with one of everything a client owns hanging off it. */
async function buildCaseForClient1(): Promise<Fixture> {
  const id = uniqueId();
  const lawyer = await apiAs(LAWYER1);
  const created = await createCaseForClient1(lawyer, `E2E хөндлөн хандалт ${id}`);

  const documentName = `E2E нууц гэрээ ${id}.pdf`;
  const document = (await (
    await lawyer.post(`/cases/${created.id}/documents`, {
      multipart: { file: pdf(documentName), name: documentName, isVisibleToClient: 'true' },
    })
  ).json()) as { id: string };
  const hidden = (await (
    await lawyer.post(`/cases/${created.id}/documents`, {
      multipart: { file: pdf(`E2E дотоод тэмдэглэл ${id}.pdf`), name: `E2E дотоод тэмдэглэл ${id}.pdf`, isVisibleToClient: 'false' },
    })
  ).json()) as { id: string };

  const requestTitle = `E2E иргэний үнэмлэх ${id}`;
  const request = (await (
    await lawyer.post(`/cases/${created.id}/document-requests`, { data: { items: [{ title: requestTitle }] } })
  ).json()) as { id: string }[] | { id: string };
  const requestId = Array.isArray(request) ? request[0].id : request.id;

  const messageBody = `E2E зөвхөн энэ хэргийн хүмүүст ${id}`;
  expect((await lawyer.post(`/cases/${created.id}/messages`, { data: { body: messageBody } })).ok()).toBeTruthy();

  const eventTitle = `E2E шүүх хурал ${id}`;
  const event = (await (
    await lawyer.post(`/cases/${created.id}/events`, {
      data: { type: 'HEARING', title: eventTitle, eventDate: new Date(Date.now() + 86_400_000).toISOString(), isVisibleToClient: true },
    })
  ).json()) as { id: string };

  const invoice = (await (
    await lawyer.post('/invoices', {
      data: { caseId: created.id, amount: 777000, description: `E2E төлбөр ${id}`, dueDate: new Date(Date.now() + 7 * 86_400_000).toISOString() },
    })
  ).json()) as { id: string; invoiceNumber: string };
  expect((await lawyer.patch(`/invoices/${invoice.id}`, { data: { status: 'SENT' } })).ok()).toBeTruthy();

  const clients = (await (await lawyer.get('/users?role=CLIENT&limit=100')).json()) as { items: { id: string; email: string }[] };
  const clientId = clients.items.find((user) => user.email === CLIENT1.identifier)!.id;
  await lawyer.dispose();

  // The case above notified CLIENT1; their own notification is one more row an intruder must miss.
  const client = await apiAs(CLIENT1);
  const notifications = (await (await client.get('/notifications?limit=1')).json()) as { items: { id: string }[] };
  const notificationId = notifications.items[0]?.id ?? '00000000-0000-4000-8000-000000000000';
  await client.dispose();

  return {
    caseId: created.id,
    caseNumber: created.caseNumber,
    clientId,
    documentId: document.id,
    hiddenDocumentId: hidden.id,
    documentName,
    requestId,
    requestTitle,
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    eventId: event.id,
    eventTitle,
    messageBody,
    notificationId,
  };
}

interface Route {
  method: 'get' | 'post' | 'patch' | 'put' | 'delete';
  path: string;
}

/** Every route the API registers, read from the OpenAPI document it serves outside production. */
async function routesOfApi(api: APIRequestContext): Promise<Route[]> {
  const response = await api.get('/docs-json');
  expect(response.ok(), `${API_URL}/docs-json is served (NODE_ENV must not be production)`).toBeTruthy();
  const doc = (await response.json()) as { paths: Record<string, Record<string, unknown>> };
  return Object.entries(doc.paths).flatMap(([path, methods]) =>
    Object.keys(methods)
      .filter((method): method is Route['method'] => ['get', 'post', 'patch', 'put', 'delete'].includes(method))
      .map((method) => ({ method, path })),
  );
}

/** `/cases/{id}/documents` → the fixture's case id; `/documents/{id}/download` → its document id. */
function fillParams(path: string, fixture: Fixture): string | null {
  const owner = path.split('/').filter(Boolean)[0];
  const byOwner: Record<string, string> = {
    cases: fixture.caseId,
    documents: fixture.documentId,
    'document-requests': fixture.requestId,
    invoices: fixture.invoiceId,
    events: fixture.eventId,
    users: fixture.clientId,
    notifications: fixture.notificationId,
  };
  // `{caseId}` and `{userId}` say what they are; a bare `{id}` belongs to the first segment.
  const byName: Record<string, string> = { caseId: fixture.caseId, userId: fixture.clientId };
  let filled = path;
  for (const [, name] of path.matchAll(/\{([^}]+)\}/g)) {
    const value = byName[name] ?? byOwner[owner];
    if (!value) return null;
    filled = filled.replace(`{${name}}`, value);
  }
  return filled;
}

test.describe('Хөндлөн хандалт', () => {
  test('CLIENT2 ба багийн бус LAWYER нь CLIENT1-ийн ямар ч мөрөнд хүрэхгүй', async () => {
    const fixture = await buildCaseForClient1();
    const owner = await apiAs(CLIENT1);
    const routes = await routesOfApi(owner);
    expect(routes.length, 'the OpenAPI document lists the whole API').toBeGreaterThan(80);

    // Control: the rows exist and their owner reads them. Without this the sweep below could pass
    // on a server that answers 404 to everybody.
    expect((await owner.get(`/cases/${fixture.caseId}`)).status()).toBe(200);
    expect((await owner.get(`/invoices/${fixture.invoiceId}`)).status()).toBe(200);
    expect((await owner.get(`/documents/${fixture.documentId}/download`)).status()).toBe(200);
    expect((await owner.get(`/cases/${fixture.caseId}/messages`)).status()).toBe(200);
    // …and the staff-only document stays staff-only even for the case's own client.
    expect((await owner.get(`/documents/${fixture.hiddenDocumentId}/download`)).status()).toBe(403);
    await owner.dispose();

    const intruders: [string, APIRequestContext][] = [
      ['CLIENT2', await apiAs(CLIENT2)],
      ['LAWYER2', await apiAs(LAWYER2)],
    ];
    const reached: string[] = [];
    let checked = 0;

    for (const [who, api] of intruders) {
      for (const route of routes) {
        const url = fillParams(route.path, fixture);
        if (!url || url === route.path) continue; // no id of CLIENT1's in this path
        checked += 1;
        const response = await api[route.method](url, route.method === 'get' ? undefined : { data: {} });
        // A mutation may be stopped by validation before the scope check; what must never happen
        // is a 2xx. A read has to say 403 or 404 outright.
        const ok = route.method === 'get' ? [403, 404].includes(response.status()) : response.status() >= 400;
        const key = `${who} ${route.method.toUpperCase()} ${route.path}`;
        if (!ok && !FIRM_WIDE_FOR_STAFF.has(key)) reached.push(`${key} → ${response.status()}`);
      }
    }
    expect(checked, 'the sweep actually tried a meaningful number of routes').toBeGreaterThan(30);
    expect(reached).toEqual([]);

    // The exception above is for staff only: another client is refused the same route.
    const [, otherClient] = intruders[0];
    expect((await otherClient.get(`/users/${fixture.clientId}`)).status()).toBe(403);

    for (const [, api] of intruders) await api.dispose();
  });

  test('CLIENT1-ийн мөрүүд бусдын ямар ч жагсаалтад гарахгүй', async () => {
    const fixture = await buildCaseForClient1();
    const owner = await apiAs(CLIENT1);
    const routes = await routesOfApi(owner);
    await owner.dispose();

    // Anything that would identify the case or what hangs off it.
    const secrets: [string, string][] = [
      ['case id', fixture.caseId],
      ['case number', fixture.caseNumber],
      ['document id', fixture.documentId],
      ['document name', fixture.documentName],
      ['request id', fixture.requestId],
      ['request title', fixture.requestTitle],
      ['invoice id', fixture.invoiceId],
      ['invoice number', fixture.invoiceNumber],
      ['event id', fixture.eventId],
      ['event title', fixture.eventTitle],
      ['message body', fixture.messageBody],
    ];

    const leaked: string[] = [];
    let checked = 0;
    for (const [who, user] of [['CLIENT2', CLIENT2], ['LAWYER2', LAWYER2]] as const) {
      // A client must not even learn who the other client is; for staff the directory is shared.
      const forWho = who === 'CLIENT2' ? [...secrets, ['client e-mail', CLIENT1.identifier] as [string, string]] : secrets;
      const api = await apiAs(user);
      // Every listing — the routes that take no id of anyone's and hand back whatever is in scope.
      for (const route of routes.filter((candidate) => candidate.method === 'get' && !candidate.path.includes('{'))) {
        const response = await api.get(route.path);
        if (!response.ok()) continue;
        const body = await response.text();
        checked += 1;
        for (const [label, secret] of forWho) {
          if (body.includes(secret)) leaked.push(`${who} GET ${route.path} → ${label}`);
        }
      }
      await api.dispose();
    }
    expect(checked, 'the sweep actually read a meaningful number of listings').toBeGreaterThan(20);
    expect(leaked).toEqual([]);
  });

  test('багийн бус LAWYER хэргийг удирдаж ч чадахгүй, уншиж ч чадахгүй', async () => {
    const fixture = await buildCaseForClient1();
    const outsider = await apiAs(LAWYER2);

    // Reads
    expect((await outsider.get(`/cases/${fixture.caseId}`)).status()).toBe(403);
    expect((await outsider.get(`/cases/${fixture.caseId}/documents`)).status()).toBe(403);
    expect((await outsider.get(`/cases/${fixture.caseId}/events`)).status()).toBe(403);
    expect((await outsider.get(`/cases/${fixture.caseId}/messages`)).status()).toBe(403);
    expect((await outsider.get(`/cases/${fixture.caseId}/document-requests`)).status()).toBe(403);
    expect((await outsider.get(`/invoices/${fixture.invoiceId}`)).status()).toBe(403);
    expect((await outsider.get(`/documents/${fixture.documentId}/download`)).status()).toBe(403);

    // Writes, with bodies valid enough to reach the scope check rather than the validator
    expect((await outsider.post(`/cases/${fixture.caseId}/messages`, { data: { body: 'E2E гаднаас' } })).status()).toBe(403);
    expect(
      (
        await outsider.post(`/cases/${fixture.caseId}/events`, {
          data: { type: 'NOTE', title: 'E2E гаднаас', eventDate: new Date().toISOString() },
        })
      ).status(),
    ).toBe(403);
    expect(
      (await outsider.post('/invoices', { data: { caseId: fixture.caseId, amount: 1000, description: 'E2E гаднаас', dueDate: new Date(Date.now() + 86_400_000).toISOString() } })).status(),
    ).toBe(403);
    expect((await outsider.patch(`/cases/${fixture.caseId}`, { data: { title: 'E2E гаднаас' } })).status()).toBe(403);
    expect(
      (await outsider.post(`/cases/${fixture.caseId}/documents`, { multipart: { file: pdf('outsider.pdf'), name: 'outsider.pdf', isVisibleToClient: 'false' } })).status(),
    ).toBe(403);
    expect((await outsider.post(`/cases/${fixture.caseId}/document-requests`, { data: { items: [{ title: 'E2E гаднаас' }] } })).status()).toBe(403);
    await outsider.dispose();
  });

  test('CLIENT2 өөр харилцагчийн хэрэгт бичиж, файл илгээж чадахгүй', async () => {
    const fixture = await buildCaseForClient1();
    const stranger = await apiAs(CLIENT2);

    expect((await stranger.post(`/cases/${fixture.caseId}/messages`, { data: { body: 'E2E хөндлөнгөөс' } })).status()).toBe(403);
    expect(
      (await stranger.post(`/cases/${fixture.caseId}/documents`, { multipart: { file: pdf('stranger.pdf'), name: 'stranger.pdf' } })).status(),
    ).toBe(403);
    expect((await stranger.post(`/document-requests/${fixture.requestId}/submit`, { multipart: { files: pdf('stranger.pdf') } })).status()).toBe(403);
    expect((await stranger.post(`/invoices/${fixture.invoiceId}/mark-paid`, { data: {} })).status()).toBe(403);
    expect((await stranger.post(`/cases/${fixture.caseId}/messages/read`)).status()).toBe(403);
    expect((await stranger.get(`/cases/${fixture.caseId}/messages/unread-count`)).status()).toBe(403);
    await stranger.dispose();
  });
});
