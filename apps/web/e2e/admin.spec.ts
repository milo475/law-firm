import { type Locator, type Page, expect, request as playwrightRequest, test } from '@playwright/test';
import { ADMIN, API_URL, CLIENT1, LAWYER1, LAWYER2, login } from './fixtures';

const uniqueId = () => Date.now().toString(36);

/** Form labels carry a trailing required marker (" *"), so match on the prefix. */
const field = (scope: Page | Locator, label: string) => scope.getByLabel(new RegExp(`^${label}`));

async function pick(page: Page, label: string, option: string | RegExp) {
  await field(page, label).click();
  await page.getByRole('option', { name: option }).first().click();
}

function localDateTime(daysAhead: number): string {
  const date = new Date(Date.now() + daysAhead * 86_400_000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T10:00`;
}

test.describe('Админ самбар', () => {
  test('LAWYER хэрэг үүсгээд шүүх хурал нэмэхэд харилцагч порталдаа харна', async ({ page, browser }, testInfo) => {
    const id = uniqueId();
    const caseTitle = `E2E цалингийн маргаан ${id}`;
    const eventTitle = `E2E анхан шатны шүүх хурал ${id}`;

    await login(page, LAWYER1);
    await page.goto('/admin/cases/new');
    await field(page, 'Хэргийн нэр').fill(caseTitle);
    await pick(page, 'Хэргийн төрөл', 'Хөдөлмөрийн маргаан');
    await pick(page, 'Харилцагч', /client1@example\.mn/);
    await field(page, 'Тайлбар').fill('Playwright e2e: ажил олгогч цалинг гурван сар олгоогүй.');
    await page.getByRole('button', { name: 'Хэрэг үүсгэх' }).click();

    await expect(page).toHaveURL(/\/admin\/cases\/[0-9a-f-]{36}$/);
    const caseId = page.url().split('/').pop()!;
    await expect(page.getByRole('heading', { name: caseTitle })).toBeVisible();

    await page.getByRole('tab', { name: 'Явцын түүх' }).click();
    await page.getByRole('button', { name: 'Үйл явдал нэмэх' }).click();
    const dialog = page.getByRole('dialog');
    await expect(field(dialog, 'Төрөл')).toContainText('Шүүх хурал');
    await expect(dialog.getByRole('checkbox')).toBeChecked();
    await field(dialog, 'Огноо, цаг').fill(localDateTime(5));
    await field(dialog, 'Гарчиг').fill(eventTitle);
    await dialog.getByRole('button', { name: 'Хадгалах' }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByText(eventTitle).filter({ visible: true }).first()).toBeVisible();

    const clientContext = await browser.newContext({ baseURL: testInfo.project.use.baseURL });
    const client = await clientContext.newPage();
    await login(client, CLIENT1);
    await client.goto(`/portal/cases/${caseId}`);
    await expect(client.getByRole('heading', { name: caseTitle })).toBeVisible();
    await expect(client.getByText(eventTitle).filter({ visible: true }).first()).toBeVisible();
    await client.goto('/portal/notifications');
    await expect(client.getByText(eventTitle).filter({ visible: true }).first()).toBeVisible();
    await clientContext.close();
  });

  test('ADMIN нийтлэл нийтлэхэд нийтийн /news хуудсанд шууд гарна', async ({ page, browser }, testInfo) => {
    const title = `E2E туршилтын мэдээ ${uniqueId()}`;

    await login(page, ADMIN);
    await page.goto('/admin/posts/new');
    await field(page, 'Гарчиг').fill(title);
    await field(page, 'Товч агуулга').fill('Playwright e2e тестээр нийтэлсэн туршилтын мэдээ.');
    await page.getByLabel('Агуулга (Markdown)').fill('## Туршилт\n\nЭнэ нийтлэл **шууд** харагдах ёстой.');
    await page.getByRole('button', { name: 'Нийтлэх' }).click();
    await expect(page).toHaveURL(/\/admin\/posts$/);

    const manage = await page.request.get(`${API_URL}/posts/manage?search=${encodeURIComponent(title)}`);
    expect(manage.ok()).toBeTruthy();
    const { items } = (await manage.json()) as { items: { id: string; slug: string; status: string }[] };
    expect(items).toHaveLength(1);
    const [post] = items;
    expect(post.status).toBe('PUBLISHED');

    try {
      const visitorContext = await browser.newContext({ baseURL: testInfo.project.use.baseURL });
      const visitor = await visitorContext.newPage();
      await visitor.goto('/news');
      await expect(visitor.getByRole('link', { name: title }).first()).toBeVisible();
      await visitor.goto(`/news/${post.slug}`);
      await expect(visitor.getByRole('heading', { level: 1 })).toContainText(title);
      await visitorContext.close();
    } finally {
      // Keep the public news list stable across runs.
      await page.request.delete(`${API_URL}/posts/${post.id}`);
      await page.request.post('/api/revalidate', { data: { slugs: [post.slug] } });
    }
  });

  test('LAWYER өөр хуульчийн хэрэг рүү URL-ээр орвол 403, засах API ч хаалттай', async ({ page }) => {
    const api = await playwrightRequest.newContext({ baseURL: API_URL });
    expect((await api.post('/auth/login', { data: LAWYER2 })).ok()).toBeTruthy();
    const { items } = (await (await api.get('/cases')).json()) as { items: { id: string; caseNumber: string }[] };
    await api.dispose();
    expect(items.length).toBeGreaterThan(0);
    const foreignCase = items[0];

    await login(page, LAWYER1);
    // Admin-only menu items are hidden for lawyers.
    await expect(page.getByRole('link', { name: 'Хуульчид', exact: true })).toHaveCount(0);

    await page.goto(`/admin/cases/${foreignCase.id}`);
    const alert = page.getByRole('alert').filter({ hasText: '403' });
    await expect(alert).toContainText('Энэ хэргийг удирдах эрх танд байхгүй');
    await expect(page.getByRole('button', { name: 'Хэргүүд рүү буцах' }).or(page.getByRole('link', { name: 'Хэргүүд рүү буцах' }))).toBeVisible();
    await expect(page.getByText(foreignCase.caseNumber)).toHaveCount(0);

    const patch = await page.request.patch(`${API_URL}/cases/${foreignCase.id}`, { data: { title: 'Зөвшөөрөлгүй өөрчлөлт' } });
    expect(patch.status()).toBe(403);
  });

  test('нэвтрээгүй хэрэглэгч login руу, CLIENT порталь руу шилжинэ', async ({ page }) => {
    await page.goto('/admin/cases');
    await expect(page).toHaveURL(/\/portal\/login\?next=/);

    await login(page, CLIENT1);
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/portal$/);
    await page.goto('/admin/invoices');
    await expect(page).toHaveURL(/\/portal$/);
  });
});
