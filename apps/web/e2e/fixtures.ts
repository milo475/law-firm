import { type APIRequestContext, type Page, expect, request as playwrightRequest } from '@playwright/test';

export const API_URL = process.env.E2E_API_URL ?? 'http://localhost:4000';

export const CLIENT1 = { identifier: 'client1@example.mn', password: 'Client123!' };
export const CLIENT2 = { identifier: 'client2@example.mn', password: 'Client123!' };
export const ADMIN = { identifier: 'admin@lawfirm.mn', password: 'Admin123!' };
/** Д. Энхжаргал — assigned to LF-2026-0001 in the seed. */
export const LAWYER1 = { identifier: 'enkhjargal@lawfirm.mn', password: 'Lawyer123!' };
/** Ц. Оюунбилэг — owns the other seeded cases. */
export const LAWYER2 = { identifier: 'oyunbileg@lawfirm.mn', password: 'Lawyer123!' };

type Credentials = { identifier: string; password: string };

/** Logs in through the portal form. Clients land on /portal, staff on /admin. */
export async function login(page: Page, user: Credentials = CLIENT1) {
  await page.goto('/portal/login');
  await page.locator('input[name="identifier"]').fill(user.identifier);
  await page.locator('input[name="password"]').fill(user.password);
  await page.getByRole('button', { name: 'Нэвтрэх', exact: true }).click();
  const isStaff = user.identifier.endsWith('@lawfirm.mn');
  await expect(page).toHaveURL(isStaff ? /\/admin$/ : /\/portal$/);
}

/** Logs in against the API directly; the returned context keeps the session cookies. */
export async function apiAs(user: Credentials): Promise<APIRequestContext> {
  const api = await playwrightRequest.newContext({ baseURL: API_URL });
  expect((await api.post('/auth/login', { data: user })).ok()).toBeTruthy();
  return api;
}

/** A fresh case for client1 handled by lawyer1 (pass a context logged in as lawyer1), so each run starts empty. */
export async function createCaseForClient1(lawyerApi: APIRequestContext, title: string): Promise<{ id: string; caseNumber: string }> {
  const clients = (await (await lawyerApi.get('/users?role=CLIENT&limit=100')).json()) as { items: { id: string; email: string }[] };
  const client = clients.items.find((user) => user.email === CLIENT1.identifier);
  expect(client, 'seeded client1 exists').toBeTruthy();
  const res = await lawyerApi.post('/cases', { data: { title, type: 'CIVIL', clientId: client!.id } });
  expect(res.status()).toBe(201);
  return (await res.json()) as { id: string; caseNumber: string };
}
