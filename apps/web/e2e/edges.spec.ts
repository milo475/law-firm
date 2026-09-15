import { type Locator, type Page, expect, test } from '@playwright/test';
import { ADMIN, CLIENT1, LAWYER1, LAWYER2, apiAs, createCaseForClient1, login } from './fixtures';

const uniqueId = () => Date.now().toString(36);
const unreadOf = (label: string | null) => Number(label?.match(/(\d+) уншаагүй/)?.[1] ?? 0);

/** dnd-kit listens to pointer events: press on the handle, nudge past the activation distance, move over the column, release. */
async function dragTo(page: Page, handle: Locator, column: Locator) {
  const from = (await handle.boundingBox())!;
  const to = (await column.boundingBox())!;
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(from.x + from.width / 2 + 12, from.y + from.height / 2 + 12, { steps: 4 });
  await page.mouse.move(to.x + to.width / 2, to.y + 80, { steps: 16 });
  await page.mouse.up();
}

test.describe('Сануулга, хонх, Kanban, хавсралт', () => {
  test('CLIENT-д мэдэгдэл ирэхэд портал хонхны тоо нэмэгдэж, dropdown-оос харж, бүгдийг харах руу орно', async ({ page }) => {
    const lawyerApi = await apiAs(LAWYER1);
    const clientApi = await apiAs(CLIENT1);
    const created = await createCaseForClient1(lawyerApi, `E2E хонх ${uniqueId()}`);
    const before = ((await (await clientApi.get('/notifications/unread-count')).json()) as { count: number }).count;

    await login(page, CLIENT1);
    expect((await lawyerApi.post(`/cases/${created.id}/messages`, { data: { body: 'Шүүх хурлын өмнө баримтаа шалгана уу.' } })).status()).toBe(201);
    const bell = page.getByRole('button', { name: /^Мэдэгдэл/ });
    await page.reload();
    await expect.poll(async () => unreadOf(await bell.getAttribute('aria-label'))).toBeGreaterThanOrEqual(before + 1);

    await bell.click();
    const menu = page.getByRole('menu', { name: 'Сүүлийн мэдэгдлүүд' });
    await expect(menu.getByRole('menuitem', { name: new RegExp(`Шинэ мессеж: ${created.caseNumber}`) })).toBeVisible();
    await menu.getByRole('menuitem', { name: 'Бүгдийг харах' }).click();
    await expect(page).toHaveURL(/\/portal\/notifications$/);
    await Promise.all([lawyerApi.dispose(), clientApi.dispose()]);
  });

  test('Kanban дээр даалгаврыг чирж статус солиход хадгалагдаж, зөвшөөрөгдөөгүй шилжилт буцна', async ({ page }) => {
    const adminApi = await apiAs(ADMIN);
    const me = ((await (await adminApi.get('/users?role=ADMIN&limit=10')).json()) as { items: { id: string; email: string }[] }).items.find((user) => user.email === ADMIN.identifier)!;
    const title = `E2E чирэх ${uniqueId()}`;
    const due = new Date(Date.now() + 86_400_000).toISOString();
    const task = (await (await adminApi.post('/tasks', { data: { title, assigneeId: me.id, dueDate: due } })).json()) as { id: string };

    try {
      await login(page, ADMIN);
      await page.goto('/admin/tasks?view=board&scope=mine');
      const todo = page.getByRole('region', { name: 'Хийх' });
      const doing = page.getByRole('region', { name: 'Хийгдэж буй' });
      const done = page.getByRole('region', { name: 'Дууссан' });
      const handle = (column: Locator) => column.getByRole('article', { name: title }).getByRole('button', { name: /чирэх$/ });
      await expect(todo.getByRole('article', { name: title })).toBeVisible();

      await dragTo(page, handle(todo), done);
      await expect(page.getByText('Энэ шилжилт боломжгүй')).toBeVisible();
      await expect(todo.getByRole('article', { name: title })).toBeVisible();

      await dragTo(page, handle(todo), doing);
      await expect(doing.getByRole('article', { name: title })).toBeVisible();
      await expect.poll(async () => ((await (await adminApi.get(`/tasks/${task.id}`)).json()) as { status: string }).status).toBe('IN_PROGRESS');
      await page.reload();
      await expect(doing.getByRole('article', { name: title })).toBeVisible();
    } finally {
      await adminApi.delete(`/tasks/${task.id}`);
      await adminApi.dispose();
    }
  });

  test('даалгаварт файл хавсаргаж, татаж, устгана; багийн бус хуульч татаж чадахгүй', async ({ page }) => {
    const lawyerApi = await apiAs(LAWYER1);
    const outsiderApi = await apiAs(LAWYER2);
    const members = await createCaseForClient1(lawyerApi, `E2E хавсралт ${uniqueId()}`);
    const lead = ((await (await lawyerApi.get(`/cases/${members.id}/members`)).json()) as { userId: string; role: string }[]).find((m) => m.role === 'LEAD')!;
    const title = `E2E хавсралттай даалгавар ${uniqueId()}`;
    const task = (await (await lawyerApi.post('/tasks', { data: { title, caseId: members.id, assigneeId: lead.userId } })).json()) as { id: string };

    try {
      await login(page, LAWYER1);
      await page.goto(`/admin/tasks/${task.id}`);
      // exact: the task title itself contains the word «хавсралт»
      await expect(page.getByRole('heading', { name: 'Хавсралт', exact: true })).toBeVisible();
      await page.getByLabel('Даалгаварт хавсаргах файл сонгох').setInputFiles({
        name: 'shinjeechiin-dugnelt.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\ntrailer << /Root 1 0 R >>\n%%EOF\n'),
      });
      const list = page.getByRole('list', { name: 'Хавсралтууд' });
      await expect(list.getByText('shinjeechiin-dugnelt.pdf')).toBeVisible();

      const [attachment] = (await (await lawyerApi.get(`/tasks/${task.id}/attachments`)).json()) as { id: string }[];
      const download = await lawyerApi.get(`/task-attachments/${attachment.id}/download`);
      expect(download.status()).toBe(200);
      expect(((await download.json()) as { url: string }).url).toContain('X-Amz-Signature');
      expect((await outsiderApi.get(`/task-attachments/${attachment.id}/download`)).status()).toBe(403);

      // «Татах» asks the API for a presigned URL and opens it; the URL answers with Content-Disposition: attachment, so the
      // browser saves the file. Check the URL the page received and that it really serves the uploaded PDF.
      const [downloadResponse] = await Promise.all([
        page.waitForResponse((res) => res.url().endsWith(`/task-attachments/${attachment.id}/download`) && res.request().method() === 'GET'),
        page.getByRole('button', { name: 'Татах: shinjeechiin-dugnelt.pdf' }).click(),
      ]);
      expect(downloadResponse.status()).toBe(200);
      const signed = ((await downloadResponse.json()) as { url: string; name: string }).url;
      expect(signed).toContain('X-Amz-Signature');
      const file = await page.request.get(signed);
      expect(file.status()).toBe(200);
      expect((await file.body()).subarray(0, 5).toString()).toBe('%PDF-');
      for (const extra of page.context().pages()) if (extra !== page) await extra.close();

      await page.getByRole('button', { name: 'Устгах: shinjeechiin-dugnelt.pdf' }).click();
      const dialog = page.getByRole('dialog', { name: 'Хавсралт устгах' });
      await dialog.getByRole('button', { name: 'Устгах' }).click();
      // The open dialog hides the page from the accessibility tree, so wait for it to close before looking at the list.
      await expect(dialog).toBeHidden();
      await expect(page.getByText('Хавсаргасан файл алга.')).toBeVisible();
      await expect.poll(async () => ((await (await lawyerApi.get(`/tasks/${task.id}/attachments`)).json()) as unknown[]).length).toBe(0);
    } finally {
      await lawyerApi.delete(`/tasks/${task.id}`);
      await Promise.all([lawyerApi.dispose(), outsiderApi.dispose()]);
    }
  });
});
