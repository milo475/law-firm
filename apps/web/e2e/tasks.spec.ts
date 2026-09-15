import { type Locator, type Page, expect, test } from '@playwright/test';
import { ADMIN, API_URL, CLIENT1, LAWYER1, LAWYER2, apiAs, createCaseForClient1, login } from './fixtures';

const uniqueId = () => Date.now().toString(36);

/** Form labels carry a trailing required marker (" *"), so match on the prefix. */
const field = (scope: Page | Locator, label: string) => scope.getByLabel(new RegExp(`^${label}`));

async function pick(page: Page, scope: Page | Locator, label: string, option: string | RegExp) {
  await field(scope, label).click();
  await page.getByRole('option', { name: option }).first().click();
}

test.describe('Даалгавар ба хэргийн баг', () => {
  test('ADMIN хоёр дахь хуульч нэмэх → тэр хэрэгт хандах → ахлах хуульч даалгавар оноох → гүйцэтгэгч Дууссан болгох', async ({ page, browser }, testInfo) => {
    test.setTimeout(120_000);
    const id = uniqueId();
    const taskTitle = `E2E гэрээний шинжилгээ ${id}`;
    const lawyer1Api = await apiAs(LAWYER1);
    const lawyer2Api = await apiAs(LAWYER2);
    const created = await createCaseForClient1(lawyer1Api, `E2E багийн хэрэг ${id}`);
    expect((await lawyer2Api.get(`/cases/${created.id}`)).status()).toBe(403);

    try {
      // ADMIN adds lawyer2 to the team from the "Баг" tab
      await login(page, ADMIN);
      await page.goto(`/admin/cases/${created.id}?tab=team`);
      await page.getByRole('button', { name: 'Гишүүн нэмэх' }).click();
      const addDialog = page.getByRole('dialog', { name: 'Багт гишүүн нэмэх' });
      await pick(page, addDialog, 'Ажилтан', /Оюунбилэг/);
      await addDialog.getByRole('button', { name: 'Нэмэх' }).click();
      await expect(addDialog).toBeHidden();
      await expect(page.getByRole('tabpanel').getByRole('listitem', { name: /Оюунбилэг/ })).toBeVisible();

      // lawyer2 can now open the case
      const lawyer2Context = await browser.newContext({ baseURL: testInfo.project.use.baseURL });
      const lawyer2Page = await lawyer2Context.newPage();
      await login(lawyer2Page, LAWYER2);
      await lawyer2Page.goto(`/admin/cases/${created.id}`);
      await expect(lawyer2Page.getByRole('heading', { name: `E2E багийн хэрэг ${id}` })).toBeVisible();

      // The lead lawyer assigns lawyer2 a task from the case "Даалгавар" tab
      const leadContext = await browser.newContext({ baseURL: testInfo.project.use.baseURL });
      const leadPage = await leadContext.newPage();
      await login(leadPage, LAWYER1);
      await leadPage.goto(`/admin/cases/${created.id}?tab=tasks`);
      await leadPage.getByRole('button', { name: 'Даалгавар нэмэх' }).click();
      const taskDialog = leadPage.getByRole('dialog', { name: 'Шинэ даалгавар' });
      await field(taskDialog, 'Гарчиг').fill(taskTitle);
      await pick(leadPage, taskDialog, 'Гүйцэтгэгч', /Оюунбилэг/);
      await pick(leadPage, taskDialog, 'Ач холбогдол', 'Өндөр');
      await taskDialog.getByRole('button', { name: 'Даалгавар үүсгэх' }).click();
      await expect(taskDialog).toBeHidden();
      await expect(leadPage.getByRole('link', { name: taskTitle }).filter({ visible: true })).toBeVisible();

      const notifications = (await (await lawyer2Api.get('/notifications?limit=10')).json()) as { items: { title: string }[] };
      expect(notifications.items.map((item) => item.title)).toContain(`Танд даалгавар оноолоо: ${taskTitle}`);

      // lawyer2 finds it under "Надад оноогдсон" and moves it TODO → IN_PROGRESS → REVIEW → DONE.
      // Filtered to «Хийх»: the list sorts by due date (undated last), and earlier runs leave lawyer2 many dated finished tasks.
      await lawyer2Page.goto('/admin/tasks?scope=mine&status=TODO');
      await lawyer2Page.getByRole('link', { name: taskTitle }).filter({ visible: true }).click();
      await expect(lawyer2Page).toHaveURL(/\/admin\/tasks\/[0-9a-f-]{36}$/);
      await expect(lawyer2Page.getByRole('heading', { name: taskTitle })).toBeVisible();
      for (const [action, label] of [['Эхлүүлэх', 'Хийгдэж буй'], ['Хянуулах', 'Хянах'], ['Дуусгах', 'Дууссан']] as const) {
        await lawyer2Page.getByRole('button', { name: action, exact: true }).click();
        await expect(lawyer2Page.getByRole('main').getByText(label, { exact: true }).first()).toBeVisible();
      }
      await expect(lawyer2Page.getByText('Дууссан', { exact: true }).first()).toBeVisible();
      await expect(lawyer2Page.getByRole('term').filter({ hasText: 'Дууссан' })).toBeVisible();

      const leadNotifications = (await (await lawyer1Api.get('/notifications?limit=10')).json()) as { items: { title: string }[] };
      expect(leadNotifications.items.map((item) => item.title)).toContain(`Даалгавар «Дууссан» боллоо: ${taskTitle}`);

      await Promise.all([lawyer2Context.close(), leadContext.close()]);
    } finally {
      // Take lawyer2 off the team again: admin.spec picks a case lawyer1 cannot open from lawyer2's case list.
      const adminApi = await apiAs(ADMIN);
      const members = (await (await adminApi.get(`/cases/${created.id}/members`)).json()) as { userId: string; role: string; user: { email: string } }[];
      const added = members.find((member) => member.user.email === LAWYER2.identifier && member.role === 'MEMBER');
      if (added) await adminApi.delete(`/cases/${created.id}/members/${added.userId}`);
      await Promise.all([adminApi.dispose(), lawyer1Api.dispose(), lawyer2Api.dispose()]);
    }
  });

  test('багийн бус хуульч даалгавар болон хэргийн URL-аар 403 авна; харилцагч даалгавар огт харахгүй', async ({ page }) => {
    const id = uniqueId();
    const lawyer1Api = await apiAs(LAWYER1);
    const created = await createCaseForClient1(lawyer1Api, `E2E хаалттай хэрэг ${id}`);
    const me = (await (await lawyer1Api.get(`/cases/${created.id}/members`)).json()) as { userId: string; role: string }[];
    const leadId = me.find((member) => member.role === 'LEAD')!.userId;
    const taskRes = await lawyer1Api.post('/tasks', { data: { title: `E2E нууц даалгавар ${id}`, caseId: created.id, assigneeId: leadId } });
    expect(taskRes.status()).toBe(201);
    const task = (await taskRes.json()) as { id: string };

    await login(page, LAWYER2);
    await page.goto(`/admin/tasks/${task.id}`);
    await expect(page.getByRole('alert').filter({ hasText: '403' })).toContainText('Энэ даалгаврыг үзэх эрх танд байхгүй');
    await expect(page.getByText(`E2E нууц даалгавар ${id}`)).toHaveCount(0);
    await page.goto(`/admin/cases/${created.id}`);
    await expect(page.getByRole('alert').filter({ hasText: '403' })).toContainText('Энэ хэргийг удирдах эрх танд байхгүй');

    expect((await page.request.get(`${API_URL}/tasks/${task.id}`)).status()).toBe(403);
    expect((await page.request.patch(`${API_URL}/tasks/${task.id}`, { data: { status: 'IN_PROGRESS' } })).status()).toBe(403);
    expect((await page.request.post(`${API_URL}/tasks/${task.id}/comments`, { data: { body: 'Хөндлөнгийн' } })).status()).toBe(403);
    const list = (await (await page.request.get(`${API_URL}/tasks?limit=100`)).json()) as { items: { id: string }[] };
    expect(list.items.map((item) => item.id)).not.toContain(task.id);

    const clientApi = await apiAs(CLIENT1);
    expect((await clientApi.get('/tasks')).status()).toBe(403);
    expect((await clientApi.get(`/tasks/${task.id}`)).status()).toBe(403);
    await Promise.all([clientApi.dispose(), lawyer1Api.dispose()]);
  });

  test('хуульч өөртөө дотоод даалгавар үүсгэж, Kanban самбар дээр шилжүүлнэ (өөртөө оноовол мэдэгдэл очихгүй)', async ({ page }) => {
    test.setTimeout(90_000);
    const title = `E2E сургалтын тайлан ${uniqueId()}`;
    await login(page, LAWYER1);
    await page.goto('/admin/tasks');
    await page.getByRole('button', { name: 'Шинэ даалгавар' }).click();
    const dialog = page.getByRole('dialog', { name: 'Шинэ даалгавар' });
    await field(dialog, 'Гарчиг').fill(title);
    await expect(field(dialog, 'Хэрэг')).toContainText('Хэрэггүй — дотоод ажил');
    await expect(field(dialog, 'Гүйцэтгэгч')).toBeDisabled();
    await expect(field(dialog, 'Гүйцэтгэгч')).toContainText('(Та)');
    await dialog.getByRole('button', { name: 'Даалгавар үүсгэх' }).click();
    await expect(dialog).toBeHidden();

    await page.getByRole('tab', { name: 'Самбар' }).click();
    await expect(page).toHaveURL(/view=board/);
    const todo = page.getByRole('region', { name: 'Хийх' });
    const card = todo.getByRole('article', { name: title });
    await expect(card).toBeVisible();
    await card.getByRole('button', { name: 'Эхлүүлэх' }).click();
    await expect(page.getByRole('region', { name: 'Хийгдэж буй' }).getByRole('article', { name: title })).toBeVisible();
    await expect(todo.getByRole('article', { name: title })).toHaveCount(0);

    const notifications = (await (await page.request.get(`${API_URL}/notifications?limit=20`)).json()) as { items: { title: string }[] };
    expect(notifications.items.some((item) => item.title.includes(title))).toBe(false);

    // Clean up so the lawyer's board stays small across runs.
    const mine = (await (await page.request.get(`${API_URL}/tasks?scope=mine&limit=100`)).json()) as { items: { id: string; title: string }[] };
    const createdTask = mine.items.find((item) => item.title === title);
    expect(createdTask).toBeTruthy();
    expect((await page.request.delete(`${API_URL}/tasks/${createdTask!.id}`)).status()).toBe(204);
  });
});
