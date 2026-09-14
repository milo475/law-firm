/**
 * Captures desktop (1440) + mobile (390) screenshots of every page into screenshots/.
 * Run: pnpm --filter @law-firm/web e2e:screenshots
 */
import { test } from '@playwright/test';
import { login } from './fixtures';

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
  ['portal-documents', '/portal/documents'],
  ['portal-invoices', '/portal/invoices'],
  ['portal-messages', '/portal/messages'],
  ['portal-notifications', '/portal/notifications'],
  ['portal-profile', '/portal/profile'],
];

test.describe('screenshots', () => {
  test.setTimeout(240_000);

  test('public pages', async ({ page }, testInfo) => {
    const suffix = testInfo.project.name;
    for (const [name, path] of PUBLIC_PAGES) {
      await page.goto(path, { waitUntil: 'networkidle' });
      await page.screenshot({ path: `screenshots/${name}.${suffix}.png`, fullPage: true });
    }
  });

  test('portal pages', async ({ page }, testInfo) => {
    const suffix = testInfo.project.name;
    await login(page);
    for (const [name, path] of PORTAL_PAGES) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);
      await page.screenshot({ path: `screenshots/${name}.${suffix}.png`, fullPage: true });
    }
    // detail pages: first case + first invoice
    await page.goto('/portal/cases');
    await page.waitForLoadState('networkidle');
    const caseLink = page.locator('a[href^="/portal/cases/"]').first();
    await caseLink.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.screenshot({ path: `screenshots/portal-case-detail.${suffix}.png`, fullPage: true });
    await page.goto('/portal/invoices');
    await page.waitForLoadState('networkidle');
    await page.locator('a[href^="/portal/invoices/"]').first().click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.screenshot({ path: `screenshots/portal-invoice-detail.${suffix}.png`, fullPage: true });
  });
});
