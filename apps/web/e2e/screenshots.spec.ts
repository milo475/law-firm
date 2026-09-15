/**
 * Captures desktop (1440) + mobile (390) screenshots of every page into screenshots/.
 * Run: pnpm --filter @law-firm/web e2e:screenshots
 */
import { test } from '@playwright/test';
import { ADMIN, API_URL, login } from './fixtures';

const PUBLIC_PAGES: [string, string][] = [
  ['home', '/'],
  ['about', '/about'],
  ['services', '/services'],
  ['service-detail', '/services/civil'],
  ['lawyers', '/lawyers'],
  ['news', '/news'],
  ['news-detail', '/news/geree-baiguulahad-anhaarah-zuils'],
  ['faq', '/faq'],
  ['contact', '/contact'],
  ['not-found', '/this-page-does-not-exist'],
  ['portal-login', '/portal/login'],
  ['portal-register', '/portal/register'],
  ['portal-forgot', '/portal/forgot-password'],
];

const PORTAL_PAGES: [string, string][] = [
  ['portal-dashboard', '/portal'],
  ['portal-cases', '/portal/cases'],
  ['portal-requests', '/portal/requests'],
  ['portal-request-new', '/portal/requests/new'],
  ['portal-documents', '/portal/documents'],
  ['portal-invoices', '/portal/invoices'],
  ['portal-messages', '/portal/messages'],
  ['portal-notifications', '/portal/notifications'],
  ['portal-profile', '/portal/profile'],
];

const ADMIN_PAGES: [string, string][] = [
  ['admin-dashboard', '/admin'],
  ['admin-cases', '/admin/cases'],
  ['admin-tasks', '/admin/tasks'],
  ['admin-tasks-board', '/admin/tasks?view=board'],
  ['admin-notifications', '/admin/notifications'],
  ['admin-performance', '/admin/performance'],
  ['admin-case-new', '/admin/cases/new'],
  ['admin-clients', '/admin/clients'],
  ['admin-lawyers', '/admin/lawyers'],
  ['admin-posts', '/admin/posts'],
  ['admin-post-new', '/admin/posts/new'],
  ['admin-invoices', '/admin/invoices'],
  ['admin-requests', '/admin/requests'],
  ['admin-settings', '/admin/settings'],
  ['admin-profile', '/admin/profile'],
];

test.describe('screenshots', () => {
  test.setTimeout(240_000);

  test('public pages', async ({ page }, testInfo) => {
    const suffix = testInfo.project.name;
    for (const [name, path] of PUBLIC_PAGES) {
      await page.goto(path, { waitUntil: 'load', timeout: 30_000 });
      await page.waitForTimeout(600);
      await page.screenshot({ path: `screenshots/${name}.${suffix}.png`, fullPage: true });
    }
  });

  test('portal pages', async ({ page }, testInfo) => {
    const suffix = testInfo.project.name;
    await login(page);
    for (const [name, path] of PORTAL_PAGES) {
      await page.goto(path, { waitUntil: 'load', timeout: 30_000 });
      await page.waitForTimeout(1200);
      await page.screenshot({ path: `screenshots/${name}.${suffix}.png`, fullPage: true });
    }
    // detail pages: first case + first invoice
    await page.goto('/portal/cases', { waitUntil: 'load' });
    const caseLink = page.locator('a[href^="/portal/cases/"]:visible').first();
    await caseLink.waitFor();
    await caseLink.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `screenshots/portal-case-detail.${suffix}.png`, fullPage: true });
    // document requests tab of the seeded case that has requests (LF-YYYY-0001); desktop lists cases as a table
    // search: e2e runs keep adding cases for client1, so the seeded case can fall off the first page
    const { items: clientCases } = (await (await page.request.get(`${API_URL}/cases?search=0001&limit=50`)).json()) as { items: { id: string; caseNumber: string }[] };
    const requestCase = clientCases.find((c) => c.caseNumber.endsWith('-0001'));
    if (!requestCase) throw new Error('Seeded case LF-YYYY-0001 not found for the client');
    await page.goto(`/portal/cases/${requestCase.id}?tab=requests`, { waitUntil: 'load' });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `screenshots/portal-case-requests.${suffix}.png`, fullPage: true });
    await page.goto('/portal/invoices', { waitUntil: 'load' });
    const invLink = page.locator('a[href^="/portal/invoices/"]:visible').first();
    await invLink.waitFor();
    await invLink.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `screenshots/portal-invoice-detail.${suffix}.png`, fullPage: true });
    await page.goto('/portal', { waitUntil: 'load' });
    await page.getByRole('button', { name: /^Мэдэгдэл/ }).click();
    await page.getByRole('menu', { name: 'Сүүлийн мэдэгдлүүд' }).waitFor();
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `screenshots/portal-notification-bell.${suffix}.png` });
  });

  test('admin pages', async ({ page }, testInfo) => {
    const suffix = testInfo.project.name;
    await login(page, ADMIN);
    for (const [name, path] of ADMIN_PAGES) {
      await page.goto(path, { waitUntil: 'load', timeout: 30_000 });
      await page.waitForTimeout(1200);
      await page.screenshot({ path: `screenshots/${name}.${suffix}.png`, fullPage: true });
    }
    for (const [name, list, prefix] of [
      ['admin-case-detail', '/admin/cases', '/admin/cases/'],
      ['admin-client-detail', '/admin/clients', '/admin/clients/'],
    ] as const) {
      await page.goto(list, { waitUntil: 'load' });
      const link = page.locator(`a[href^="${prefix}"]:not([href$="/new"]):visible`).first();
      await link.waitFor();
      await link.click();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: `screenshots/${name}.${suffix}.png`, fullPage: true });
    }
    await page.goto('/admin/cases?search=0001', { waitUntil: 'load' });
    const requestCase = page.locator('a[href^="/admin/cases/"]:not([href$="/new"]):visible').first();
    await requestCase.waitFor();
    const requestCaseHref = await requestCase.getAttribute('href');
    await page.goto(`${requestCaseHref}?tab=requests`, { waitUntil: 'load' });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `screenshots/admin-case-requests.${suffix}.png`, fullPage: true });
    // ADMIN only views the chat, so this does not mark the seeded messages read
    await page.goto(`${requestCaseHref}?tab=messages`, { waitUntil: 'load' });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `screenshots/admin-case-messages.${suffix}.png`, fullPage: true });
    await page.goto(`${requestCaseHref}?tab=team`, { waitUntil: 'load' });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `screenshots/admin-case-team.${suffix}.png`, fullPage: true });
    await page.goto(`${requestCaseHref}?tab=tasks`, { waitUntil: 'load' });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `screenshots/admin-case-tasks.${suffix}.png`, fullPage: true });
    await page.goto('/admin/tasks', { waitUntil: 'load' });
    const taskLink = page.locator('a[href^="/admin/tasks/"]:visible').first();
    await taskLink.waitFor();
    await taskLink.click();
    await page.waitForURL(/\/admin\/tasks\/[0-9a-f-]{36}$/);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `screenshots/admin-task-detail.${suffix}.png`, fullPage: true });
    await page.goto('/admin', { waitUntil: 'load' });
    await page.getByRole('button', { name: /^Мэдэгдэл/ }).click();
    await page.getByRole('menu', { name: 'Сүүлийн мэдэгдлүүд' }).waitFor();
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `screenshots/admin-notification-bell.${suffix}.png` });
    await page.keyboard.press('Escape');
    await page.goto('/admin/performance', { waitUntil: 'load' });
    const person = page.locator('a[href^="/admin/performance/"]:visible').first();
    await person.waitFor();
    await person.click();
    await page.waitForURL(/\/admin\/performance\/[0-9a-f-]{36}/);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `screenshots/admin-performance-detail.${suffix}.png`, fullPage: true });
    // A service request waiting for a lawyer, and its assign modal (only opened, never submitted)
    const { items: accepted } = (await (await page.request.get(`${API_URL}/service-requests?status=ACCEPTED&limit=1`)).json()) as { items: { id: string }[] };
    if (accepted[0]) {
      await page.goto(`/admin/requests/${accepted[0].id}`, { waitUntil: 'load' });
      const assign = page.getByRole('button', { name: 'Өмгөөлөгч хуваарилах' });
      await assign.waitFor();
      await page.waitForTimeout(1200);
      await page.screenshot({ path: `screenshots/admin-request-detail.${suffix}.png`, fullPage: true });
      await assign.click();
      await page.getByRole('dialog', { name: 'Өмгөөлөгч хуваарилах' }).getByRole('radio', { name: 'Баг' }).waitFor();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: `screenshots/admin-request-assign.${suffix}.png` });
      await page.keyboard.press('Escape');
    }
  });
});
