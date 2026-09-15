import { type APIRequestContext, expect, test } from '@playwright/test';
import { ADMIN, LAWYER1, LAWYER2, apiAs, login } from './fixtures';

const uniqueId = () => Date.now().toString(36);

async function staffId(adminApi: APIRequestContext, email: string): Promise<string> {
  const { items } = (await (await adminApi.get('/users?role=LAWYER&limit=100')).json()) as { items: { id: string; email: string }[] };
  const user = items.find((item) => item.email === email);
  expect(user, `seeded lawyer ${email}`).toBeTruthy();
  return user!.id;
}

async function assignTask(adminApi: APIRequestContext, assigneeId: string, title: string): Promise<string> {
  const res = await adminApi.post('/tasks', { data: { title, assigneeId, priority: 'HIGH' } });
  expect(res.status()).toBe(201);
  return ((await res.json()) as { id: string }).id;
}

type NotificationRow = { title: string; isRead: boolean; link: string | null; actor: { firstName: string } | null };
const notificationsOf = async (api: APIRequestContext) => ((await (await api.get('/notifications?limit=50')).json()) as { items: NotificationRow[] }).items;
const badgeCount = (label: string | null) => Number(label?.match(/(\d+) уншаагүй/)?.[1] ?? 0);

test.describe('Ажилтны мэдэгдэл', () => {
  test('LAWYER-т даалгавар оноогдоход хонхны тоо нэмэгдэж, мэдэгдлээс даалгавар руу орж уншсан болно', async ({ page }) => {
    const title = `E2E мэдэгдлийн даалгавар ${uniqueId()}`;
    const adminApi = await apiAs(ADMIN);
    const lawyerApi = await apiAs(LAWYER1);
    const before = ((await (await lawyerApi.get('/notifications/unread-count')).json()) as { count: number }).count;
    const taskId = await assignTask(adminApi, await staffId(adminApi, LAWYER1.identifier), title);

    try {
      await login(page, LAWYER1);
      const bell = page.getByRole('button', { name: /^Мэдэгдэл/ });
      await expect.poll(async () => badgeCount(await bell.getAttribute('aria-label'))).toBeGreaterThanOrEqual(before + 1);

      await bell.click();
      const menu = page.getByRole('menu', { name: 'Сүүлийн мэдэгдлүүд' });
      const item = menu.getByRole('menuitem', { name: new RegExp(`Танд даалгавар оноолоо: ${title}`) });
      await expect(item).toBeVisible();
      await expect(item).toContainText('(уншаагүй)');
      await item.click();

      await expect(page).toHaveURL(new RegExp(`/admin/tasks/${taskId}$`));
      await expect(page.getByRole('heading', { name: title })).toBeVisible();
      await expect
        .poll(async () => (await notificationsOf(lawyerApi)).find((row) => row.title === `Танд даалгавар оноолоо: ${title}`))
        .toMatchObject({ isRead: true, link: `/admin/tasks/${taskId}`, actor: { firstName: expect.any(String) } });
    } finally {
      await adminApi.delete(`/tasks/${taskId}`);
      await Promise.all([adminApi.dispose(), lawyerApi.dispose()]);
    }
  });

  test('«Бүгдийг уншсан болгох» мэдэгдлийн хуудсан дээр бүх уншаагүйг уншсан болгоно', async ({ page }) => {
    const id = uniqueId();
    const titles = [`E2E уншаагүй нэг ${id}`, `E2E уншаагүй хоёр ${id}`];
    const adminApi = await apiAs(ADMIN);
    const lawyerApi = await apiAs(LAWYER2);
    const assigneeId = await staffId(adminApi, LAWYER2.identifier);
    const taskIds = [await assignTask(adminApi, assigneeId, titles[0]), await assignTask(adminApi, assigneeId, titles[1])];

    try {
      await login(page, LAWYER2);
      await page.goto('/admin/notifications');
      await page.getByRole('tab', { name: /^Уншаагүй/ }).click();
      for (const title of titles) await expect(page.getByText(`Танд даалгавар оноолоо: ${title}`)).toBeVisible();

      await page.getByRole('button', { name: 'Бүгдийг уншсан болгох' }).click();
      await expect(page.getByText('Бүгдийг уншсан болголоо')).toBeVisible();
      for (const title of titles) await expect(page.getByText(`Танд даалгавар оноолоо: ${title}`)).toHaveCount(0);

      const rows = await notificationsOf(lawyerApi);
      for (const title of titles) expect(rows.find((row) => row.title === `Танд даалгавар оноолоо: ${title}`)?.isRead).toBe(true);
      await page.getByRole('tab', { name: 'Уншсан' }).click();
      await expect(page.getByText(`Танд даалгавар оноолоо: ${titles[0]}`)).toBeVisible();
    } finally {
      for (const taskId of taskIds) await adminApi.delete(`/tasks/${taskId}`);
      await Promise.all([adminApi.dispose(), lawyerApi.dispose()]);
    }
  });
});
