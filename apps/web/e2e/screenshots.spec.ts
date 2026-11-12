/**
 * Captures desktop (1440) + mobile (390) screenshots of every page into screenshots/.
 * Run: pnpm --filter @law-firm/web e2e:screenshots
 *
 * Two runs over the same database have to produce byte-identical images, or a real regression
 * drowns in the noise. Two things move between runs, and both are pinned below rather than hidden:
 * the clock the page reads for "5 минутын өмнө", and the login time the profile pages print.
 */
import { expect, test } from '@playwright/test';
import { getPrismaClient } from '@law-firm/shared';
import { ADMIN, API_URL, apiAs, login } from './fixtures';

const prisma = getPrismaClient();

/** Today at `hour` — the seed anchors its sample rows to the day too, so the whole set moves together. */
function todayAt(hour: number): Date {
  const date = new Date();
  date.setHours(hour, 0, 0, 0);
  return date;
}

/**
 * The "now" every page reads while it is photographed. Late enough that everything the seed stamps
 * "today" is already in the past, so no notification is ever rendered as happening in the future.
 */
const FROZEN_NOW = todayAt(18);
/** What the profile pages print as the last sign-in; the run's own logins are overwritten with it. */
const PINNED_LOGIN = todayAt(8);

/**
 * Signing in sets `lastLoginAt`, which four pages print to the minute. The baseline run is on the
 * test database (globalSetup refuses to write a baseline anywhere else), so the column is simply
 * put back to a fixed instant after each sign-in.
 */
async function pinLastLogin(): Promise<void> {
  await prisma.user.updateMany({ data: { lastLoginAt: PINNED_LOGIN } });
}

const PUBLIC_PAGES: [string, string][] = [
  ['home', '/'],
  ['about', '/about'],
  ['services', '/services'],
  ['service-detail', '/services/civil'],
  ['lawyers', '/lawyers'],
  ['reviews', '/reviews'],
  ['news', '/news'],
  ['news-detail', '/news/geree-baiguulahad-anhaarah-zuils'],
  ['faq', '/faq'],
  ['contact', '/contact'],
  ['privacy', '/privacy'],
  ['terms', '/terms'],
  ['not-found', '/this-page-does-not-exist'],
  ['portal-login', '/portal/login'],
  ['portal-register', '/portal/register'],
  ['portal-forgot', '/portal/forgot-password'],
  // The end of a one-time link; the token is rejected on submit, the page itself renders for anyone.
  ['portal-reset-password', '/portal/reset-password?token=screenshot'],
  ['portal-accept-invite', '/portal/accept-invite?token=screenshot'],
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
  ['admin-testimonials', '/admin/testimonials'],
  ['admin-settings', '/admin/settings'],
  ['admin-profile', '/admin/profile'],
];

test.describe('screenshots', () => {
  test.setTimeout(240_000);

  // Only `Date` is faked — timers keep running, so React, the query client and the animations
  // behave exactly as they do for a visitor. Applies to the screenshot run alone: `pnpm e2e`
  // skips this file.
  test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(FROZEN_NOW);
  });

  test('public pages', async ({ page }, testInfo) => {
    const suffix = testInfo.project.name;
    // Opening the news article counts as a view, and the counter is printed on three lists. The
    // run puts back what it added, so the next one photographs the same numbers.
    const views = await prisma.post.findMany({ select: { id: true, viewCount: true, updatedAt: true } });
    for (const [name, path] of PUBLIC_PAGES) {
      await page.goto(path, { waitUntil: 'load', timeout: 30_000 });
      await page.waitForTimeout(600);
      await page.screenshot({ path: `screenshots/${name}.${suffix}.png`, fullPage: true, animations: 'disabled' });
    }
    // `updatedAt` is written back with the counter: left to Prisma it would be stamped now, and the
    // admin list, which sorts by it, would come out in a different order after every run.
    for (const post of views) {
      await prisma.post.update({ where: { id: post.id }, data: { viewCount: post.viewCount, updatedAt: post.updatedAt } });
    }
  });

  test('portal pages', async ({ page }, testInfo) => {
    const suffix = testInfo.project.name;
    await login(page);
    await pinLastLogin();
    for (const [name, path] of PORTAL_PAGES) {
      await page.goto(path, { waitUntil: 'load', timeout: 30_000 });
      await page.waitForTimeout(1200);
      await page.screenshot({ path: `screenshots/${name}.${suffix}.png`, fullPage: true, animations: 'disabled' });
    }
    // detail pages: first case + first invoice
    await page.goto('/portal/cases', { waitUntil: 'load' });
    const caseLink = page.locator('a[href^="/portal/cases/"]:visible').first();
    await caseLink.waitFor();
    await caseLink.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `screenshots/portal-case-detail.${suffix}.png`, fullPage: true, animations: 'disabled' });
    // document requests tab of the seeded case that has requests (LF-YYYY-0001); desktop lists cases as a table
    // search: e2e runs keep adding cases for client1, so the seeded case can fall off the first page
    const { items: clientCases } = (await (await page.request.get(`${API_URL}/cases?search=0001&limit=50`)).json()) as { items: { id: string; caseNumber: string }[] };
    const requestCase = clientCases.find((c) => c.caseNumber.endsWith('-0001'));
    if (!requestCase) throw new Error('Seeded case LF-YYYY-0001 not found for the client');
    await page.goto(`/portal/cases/${requestCase.id}?tab=requests`, { waitUntil: 'load' });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `screenshots/portal-case-requests.${suffix}.png`, fullPage: true, animations: 'disabled' });
    await page.goto('/portal/invoices', { waitUntil: 'load' });
    const invLink = page.locator('a[href^="/portal/invoices/"]:visible').first();
    await invLink.waitFor();
    await invLink.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `screenshots/portal-invoice-detail.${suffix}.png`, fullPage: true, animations: 'disabled' });
    await page.goto('/portal', { waitUntil: 'load' });
    await page.getByRole('button', { name: /^Мэдэгдэл/ }).click();
    await page.getByRole('menu', { name: 'Сүүлийн мэдэгдлүүд' }).waitFor();
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `screenshots/portal-notification-bell.${suffix}.png` , animations: 'disabled' });
  });

  test('admin pages', async ({ page }, testInfo) => {
    const suffix = testInfo.project.name;
    await login(page, ADMIN);
    await pinLastLogin();
    for (const [name, path] of ADMIN_PAGES) {
      await page.goto(path, { waitUntil: 'load', timeout: 30_000 });
      await page.waitForTimeout(1200);
      await page.screenshot({ path: `screenshots/${name}.${suffix}.png`, fullPage: true, animations: 'disabled' });
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
      await page.screenshot({ path: `screenshots/${name}.${suffix}.png`, fullPage: true, animations: 'disabled' });
    }
    await page.goto('/admin/cases?search=0001', { waitUntil: 'load' });
    const requestCase = page.locator('a[href^="/admin/cases/"]:not([href$="/new"]):visible').first();
    await requestCase.waitFor();
    const requestCaseHref = await requestCase.getAttribute('href');
    await page.goto(`${requestCaseHref}?tab=requests`, { waitUntil: 'load' });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `screenshots/admin-case-requests.${suffix}.png`, fullPage: true, animations: 'disabled' });
    // ADMIN only views the chat, so this does not mark the seeded messages read
    await page.goto(`${requestCaseHref}?tab=messages`, { waitUntil: 'load' });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `screenshots/admin-case-messages.${suffix}.png`, fullPage: true, animations: 'disabled' });
    await page.goto(`${requestCaseHref}?tab=team`, { waitUntil: 'load' });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `screenshots/admin-case-team.${suffix}.png`, fullPage: true, animations: 'disabled' });
    await page.goto(`${requestCaseHref}?tab=tasks`, { waitUntil: 'load' });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `screenshots/admin-case-tasks.${suffix}.png`, fullPage: true, animations: 'disabled' });
    await page.goto('/admin/tasks', { waitUntil: 'load' });
    const taskLink = page.locator('a[href^="/admin/tasks/"]:visible').first();
    await taskLink.waitFor();
    await taskLink.click();
    await page.waitForURL(/\/admin\/tasks\/[0-9a-f-]{36}$/);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `screenshots/admin-task-detail.${suffix}.png`, fullPage: true, animations: 'disabled' });
    await page.goto('/admin', { waitUntil: 'load' });
    await page.getByRole('button', { name: /^Мэдэгдэл/ }).click();
    await page.getByRole('menu', { name: 'Сүүлийн мэдэгдлүүд' }).waitFor();
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `screenshots/admin-notification-bell.${suffix}.png` , animations: 'disabled' });
    await page.keyboard.press('Escape');
    await page.goto('/admin/performance', { waitUntil: 'load' });
    const person = page.locator('a[href^="/admin/performance/"]:visible').first();
    await person.waitFor();
    await person.click();
    await page.waitForURL(/\/admin\/performance\/[0-9a-f-]{36}/);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `screenshots/admin-performance-detail.${suffix}.png`, fullPage: true, animations: 'disabled' });
    // A service request waiting for a lawyer, and its assign modal (only opened, never submitted)
    const { items: accepted } = (await (await page.request.get(`${API_URL}/service-requests?status=ACCEPTED&limit=1`)).json()) as { items: { id: string }[] };
    if (accepted[0]) {
      await page.goto(`/admin/requests/${accepted[0].id}`, { waitUntil: 'load' });
      const assign = page.getByRole('button', { name: 'Өмгөөлөгч хуваарилах' });
      await assign.waitFor();
      await page.waitForTimeout(1200);
      await page.screenshot({ path: `screenshots/admin-request-detail.${suffix}.png`, fullPage: true, animations: 'disabled' });
      await assign.click();
      await page.getByRole('dialog', { name: 'Өмгөөлөгч хуваарилах' }).getByRole('radio', { name: 'Баг' }).waitFor();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: `screenshots/admin-request-assign.${suffix}.png` , animations: 'disabled' });
      await page.keyboard.press('Escape');
    }
  });

  /** The same panel seen by an editor: two menu entries, the posts work and nothing else. */
  test('editor pages', async ({ page }, testInfo) => {
    const suffix = testInfo.project.name;
    const admin = await apiAs(ADMIN);
    // Named after the project, not the clock: this user is still in the database when the other
    // project photographs /admin/lawyers, and a new address every run would rewrite that image.
    const editor = { identifier: `e2e.editor.shot.${suffix}@lawfirm.mn`, password: 'Editor123!' };
    const created = await admin.post('/users', {
      data: { email: editor.identifier, firstName: 'Сараа', lastName: 'Болд', role: 'EDITOR', password: editor.password },
    });
    expect(created.status()).toBe(201);

    await login(page, editor, /\/admin\/posts$/);
    await pinLastLogin();
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `screenshots/editor-posts.${suffix}.png`, fullPage: true, animations: 'disabled' });

    await page.goto('/admin/posts/new', { waitUntil: 'load' });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `screenshots/editor-post-new.${suffix}.png`, fullPage: true, animations: 'disabled' });
  });
});
