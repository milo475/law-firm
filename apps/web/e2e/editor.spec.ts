import path from 'node:path';
import { config as loadEnv } from 'dotenv';
import { getPrismaClient } from '@law-firm/shared';
import { type Page, expect, test } from '@playwright/test';
import { ADMIN, LAWYER1, apiAs, login } from './fixtures';

loadEnv({ path: [path.resolve(__dirname, '../../../.env')] });

const prisma = getPrismaClient();

const uniqueId = () => Date.now().toString(36);
const POSTS_LIST = /\/admin\/posts$/;

/** Form labels carry a trailing required marker (" *"), so match on the prefix. */
const field = (page: Page, label: string) => page.getByLabel(new RegExp(`^${label}`));

/** A real 1×1 PNG: the API checks the file's signature, not the browser's Content-Type. */
const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

/** Creates an EDITOR through the API as ADMIN. The `e2e.` address makes `db:clean` take it away. */
async function createEditor(lastName: string): Promise<{ identifier: string; password: string; id: string }> {
  const admin = await apiAs(ADMIN);
  const editor = { identifier: `e2e.editor.${uniqueId()}.${Math.random().toString(36).slice(2, 7)}@lawfirm.mn`, password: 'Editor123!' };
  const created = await admin.post('/users', {
    data: { email: editor.identifier, firstName: 'E2E', lastName, role: 'EDITOR', password: editor.password },
  });
  expect(created.status(), 'ADMIN can create an EDITOR').toBe(201);
  const { user } = (await created.json()) as { user: { id: string } };
  return { ...editor, id: user.id };
}

test.describe('Редактор', () => {
  test('нийтлэл бичиж, хуульчийн нэрээр нийтлэхэд сайт дээр гарна', async ({ page }) => {
    const id = uniqueId();
    // A surname nothing else on the site shares, so "did the editor's name leak?" is answerable.
    const editor = await createEditor('Нуувчсэн');

    await login(page, editor, POSTS_LIST);

    // The menu holds the job and nothing else.
    const menu = page.getByRole('navigation', { name: 'Порталын цэс' });
    await expect(menu.getByRole('link', { name: 'Нийтлэл' })).toBeVisible();
    await expect(menu.getByRole('link', { name: 'Профайл' })).toBeVisible();
    for (const hidden of ['Хянах самбар', 'Хэргүүд', 'Харилцагчид', 'Нэхэмжлэх', 'Сэтгэгдэл', 'Тохиргоо']) {
      await expect(menu.getByRole('link', { name: hidden }), `${hidden} is not an editor's`).toHaveCount(0);
    }

    const title = `E2E редакторын нийтлэл ${id}`;
    await page.goto('/admin/posts/new');
    await field(page, 'Гарчиг').fill(title);
    await field(page, 'Товч агуулга').fill('E2E: редакторын бичсэн нийтлэлийн товч агуулга.');
    await page.getByLabel('Агуулга (Markdown)').fill('## E2E\n\nРедактор нийтлэлээ бичиж, хуульчийн нэрээр нийтэллээ.');

    // The byline is chosen from the firm's lawyers; the first option is "no name at all".
    await field(page, 'Зохиогчоор харуулах').click();
    const byline = page.getByRole('option').nth(1);
    const bylineName = ((await byline.textContent()) ?? '').trim();
    expect(bylineName.length, 'a lawyer is offered as the author').toBeGreaterThan(1);
    await byline.click();

    await page.getByLabel('Нүүр зураг сонгох').setInputFiles({ name: 'cover.png', mimeType: 'image/png', buffer: PNG_1X1 });
    await expect(page.getByRole('button', { name: 'Солих' })).toBeVisible();

    await page.getByRole('button', { name: 'Нийтлэх', exact: true }).click();
    await expect(page).toHaveURL(POSTS_LIST);
    await expect(page.getByRole('link', { name: title, exact: true })).toBeVisible();

    const admin = await apiAs(ADMIN);
    const managed = (await (await admin.get(`/posts/manage?search=${encodeURIComponent(title)}&limit=5`)).json()) as {
      items: { slug: string; title: string; author: { firstName: string } | null }[];
    };
    const published = managed.items.find((post) => post.title === title);
    expect(published, 'the post is in the management list').toBeTruthy();

    // On the public site the post carries the lawyer's name — never the editor's.
    await page.goto(`/news/${published!.slug}`);
    await expect(page.getByRole('heading', { name: title })).toBeVisible();
    await expect(page.getByText(bylineName).first()).toBeVisible();
    await expect(page.getByText('Нуувчсэн')).toHaveCount(0);

    // The editor's work is in the audit log like everyone else's (the interceptor writes it after
    // the response, so give it a moment).
    await expect
      .poll(() => prisma.auditLog.count({ where: { userId: editor.id, entity: 'posts', action: 'POST /posts' } }), { timeout: 5_000 })
      .toBeGreaterThan(0);
  });

  test('редакторыг порталд ч, хэргийн хэсэгт ч оруулахгүй', async ({ page }) => {
    const editor = await createEditor('Хаалт');
    await login(page, editor, POSTS_LIST);

    for (const route of ['/portal', '/portal/cases', '/admin', '/admin/cases', '/admin/clients', '/admin/settings']) {
      await page.goto(route);
      await expect(page, `${route} redirects an editor to their own work`).toHaveURL(POSTS_LIST);
    }

    // And the API says the same thing without the browser in the way.
    const editorApi = await apiAs(editor);
    for (const path of ['/cases', '/users', '/invoices', '/admin/stats', '/messages/conversations', '/tasks']) {
      expect((await editorApi.get(path)).status(), `${path} is refused`).toBe(403);
    }
  });

  test('редактор өөр хүний нийтлэлийг засаж, устгаж чадна; хуульч чадахгүй', async ({ page }) => {
    const editor = await createEditor('Засварч');
    const admin = await apiAs(ADMIN);
    const title = `E2E админы нийтлэл ${uniqueId()}`;
    const created = await admin.post('/posts', {
      data: {
        title,
        excerpt: 'E2E: өөр хүний бичсэн нийтлэл.',
        content: 'E2E агуулга — редактор үүнийг засах эрхтэй эсэхийг шалгана.',
        category: 'NEWS',
        status: 'DRAFT',
      },
    });
    expect(created.status()).toBe(201);
    const post = (await created.json()) as { id: string };

    const editorApi = await apiAs(editor);
    const edited = await editorApi.patch(`/posts/${post.id}`, { data: { title: `${title} (зассан)` } });
    expect(edited.status(), 'an editor works on every post').toBe(200);

    // The same post is out of a lawyer's reach: they work on what they signed or typed.
    const lawyerApi = await apiAs(LAWYER1);
    expect((await lawyerApi.patch(`/posts/${post.id}`, { data: { title: 'E2E хуульчийн оролдлого' } })).status()).toBe(403);
    expect((await lawyerApi.delete(`/posts/${post.id}`)).status()).toBe(403);

    await login(page, editor, POSTS_LIST);
    await expect(page.getByRole('link', { name: `${title} (зассан)`, exact: true })).toBeVisible();

    expect((await editorApi.delete(`/posts/${post.id}`)).status()).toBe(204);
  });
});
