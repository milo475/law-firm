import { expect, request as playwrightRequest, test } from '@playwright/test';
import { CLIENT2, login } from './fixtures';

const API_URL = process.env.E2E_API_URL ?? 'http://localhost:4000';

test.describe('Харилцагчийн портал', () => {
  test('нэвтрээгүй бол login руу шилжүүлнэ; нэвтэрсний дараа dashboard харагдана', async ({ page }) => {
    await page.goto('/portal/cases');
    await expect(page).toHaveURL(/\/portal\/login\?next=/);

    await login(page);
    await expect(page.getByRole('heading', { name: /Сайн байна уу, Ганбат/ })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Идэвхтэй хэрэг' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Миний хэргүүд' })).toBeVisible();
    await expect(page.getByText('LF-2026-0001')).toBeVisible();
  });

  test('CLIENT өөр хүний хэрэг рүү URL-ээр орвол 403 хуудас харагдана', async ({ page }) => {
    // Find a case that belongs to client2 through the API.
    const api = await playwrightRequest.newContext({ baseURL: API_URL });
    const loginRes = await api.post('/auth/login', { data: CLIENT2 });
    expect(loginRes.ok()).toBeTruthy();
    const casesRes = await api.get('/cases');
    const { items } = (await casesRes.json()) as { items: { id: string; caseNumber: string }[] };
    expect(items.length).toBeGreaterThan(0);
    const foreignCaseId = items[0].id;
    await api.dispose();

    await login(page); // client1
    await page.goto(`/portal/cases/${foreignCaseId}`);
    await expect(page.getByRole('alert')).toContainText('403');
    await expect(page.getByRole('alert')).toContainText('Энэ хэргийг үзэх эрх танд байхгүй');
    await expect(page.getByRole('link', { name: 'Хэргүүд рүү буцах' })).toBeVisible();
  });
});
