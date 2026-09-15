import { type APIRequestContext, type Page, expect, test } from '@playwright/test';
import { ADMIN, LAWYER1, apiAs, login } from './fixtures';

const uniqueId = () => Date.now().toString(36);
type Row = { user: { id: string; firstName: string; lastName: string }; isSelf: boolean };
const displayName = (user: { firstName: string; lastName: string }) => `${user.lastName.charAt(0)}. ${user.firstName}`;
const byUser = async (api: APIRequestContext, period = 'this-month') =>
  ((await (await api.get(`/performance/by-user?period=${period}`)).json()) as { items: Row[] }).items;
const tableNames = (page: Page) => page.getByRole('table').locator('tbody tr td:first-child a');
/** The big number of an overview tile, found through its label. */
const tile = (page: Page, label: string) => page.getByRole('region', { name: 'Тойм' }).getByText(label, { exact: true }).locator('xpath=..').locator('.font-serif');

test.describe('Гүйцэтгэл', () => {
  test('ADMIN /admin/performance дээр бүх идэвхтэй хуульч, админыг харна', async ({ page }) => {
    const adminApi = await apiAs(ADMIN);
    const lawyers = ((await (await adminApi.get('/users?role=LAWYER&isActive=true&limit=100')).json()) as { items: { firstName: string; lastName: string }[] }).items;
    await adminApi.dispose();

    await login(page, ADMIN);
    await expect(page.getByRole('link', { name: 'Гүйцэтгэл', exact: true })).toBeVisible();
    await page.getByRole('link', { name: 'Гүйцэтгэл', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Гүйцэтгэл', level: 2 })).toBeVisible();
    await expect(tableNames(page).first()).toBeVisible();

    const names = await tableNames(page).allInnerTexts();
    for (const lawyer of lawyers) expect(names).toContain(displayName(lawyer));
    expect(names.filter((name) => name.endsWith('(Та)'))).toHaveLength(1);
  });

  test('LAWYER зөвхөн өөрийгөө болон багийн хамтрагчдаа харж, багийн бус хүний дэлгэрэнгүй рүү 403 авна', async ({ page }) => {
    const adminApi = await apiAs(ADMIN);
    const lawyerApi = await apiAs(LAWYER1);
    const id = uniqueId();
    const created = await adminApi.post('/users', {
      data: { email: `e2e.perf.${id}@lawfirm.mn`, firstName: 'Гүйцэтгэл', lastName: `Шинэ${id}`, role: 'LAWYER', password: 'Lawyer123!' },
    });
    expect(created.status()).toBe(201);
    const outsider = (await created.json()) as { id?: string; user?: { id: string } };
    const outsiderId = outsider.user?.id ?? outsider.id!;

    try {
      const visible = await byUser(lawyerApi);
      const self = visible.find((row) => row.isSelf)!;
      expect(visible.map((row) => row.user.id)).not.toContain(outsiderId);
      expect((await byUser(adminApi)).map((row) => row.user.id)).toContain(outsiderId);

      await login(page, LAWYER1);
      await page.goto('/admin/performance');
      await expect(page.getByRole('heading', { name: 'Миний болон багийн гүйцэтгэл', level: 2 })).toBeVisible();
      await expect(tableNames(page).first()).toBeVisible();
      // Other specs may add or remove teammates while this runs, so only stable facts are checked here:
      // the lawyer's own row, the seeded teammate (admin on LF-…-0001) and the brand-new lawyer who shares no case.
      const names = await tableNames(page).allInnerTexts();
      expect(names).toContain(`${displayName(self.user)} (Та)`);
      const seededTeammate = visible.find((row) => !row.isSelf && row.user.firstName === 'Батболд');
      if (seededTeammate) expect(names).toContain(displayName(seededTeammate.user));
      expect(names).not.toContain(`Ш. Гүйцэтгэл`);

      await page.goto(`/admin/performance/${outsiderId}`);
      await expect(page.getByRole('alert').filter({ hasText: '403' })).toContainText('Энэ ажилтны гүйцэтгэлийг харах эрх танд байхгүй');
      expect((await lawyerApi.get(`/performance/user/${outsiderId}`)).status()).toBe(403);
      expect((await lawyerApi.get(`/performance/timeline?userId=${outsiderId}`)).status()).toBe(403);
    } finally {
      await adminApi.patch(`/users/${outsiderId}`, { data: { isActive: false } });
      await Promise.all([adminApi.dispose(), lawyerApi.dispose()]);
    }
  });

  test('хугацааны шүүлт солиход URL болон тоо тухайн хүрээнийх болж шинэчлэгдэнэ', async ({ page }) => {
    const lawyerApi = await apiAs(LAWYER1);
    const overview = async (period: string) => ((await (await lawyerApi.get(`/performance/overview?period=${period}`)).json()) as { completedTasks: number; activeTasks: number });

    await login(page, LAWYER1);
    await page.goto('/admin/performance');
    await expect(tile(page, 'Идэвхтэй даалгавар')).toHaveText(String((await overview('this-month')).activeTasks));
    await expect(tile(page, 'Дууссан')).toHaveText(String((await overview('this-month')).completedTasks));

    for (const [label, period, unit] of [['Бүх цаг', 'all-time', 'сараар'], ['Сүүлийн 30 хоног', 'last-30-days', 'өдрөөр']] as const) {
      await page.getByRole('tab', { name: label }).click();
      await expect(page).toHaveURL(new RegExp(`period=${period}`));
      await expect(page.getByRole('tab', { name: label, selected: true })).toBeVisible();
      await expect(tile(page, 'Дууссан')).toHaveText(String((await overview(period)).completedTasks));
      await expect(page.locator('figcaption').filter({ hasText: `Дууссан даалгавар ${unit}` })).toBeVisible();
    }
    await lawyerApi.dispose();
  });
});
