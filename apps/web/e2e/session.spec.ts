import { expect, test } from '@playwright/test';
import { CLIENT1, login } from './fixtures';

test.describe('Сесс', () => {
  test('access token дууссан ч refresh хүчинтэй бол портал чимээгүй сэргээгдэж нээгдэнэ', async ({ page, context }) => {
    await login(page, CLIENT1);
    // Leave the portal first: a polling request from the old page could refresh with the same token as the new page,
    // and the API treats a second use of a rotated refresh token as theft (every session is revoked).
    await page.goto('about:blank');
    await context.clearCookies({ name: 'access_token' });

    await page.goto('/portal');
    await expect(page.getByRole('heading', { name: /Сайн байна уу/ })).toBeVisible();
    expect((await context.cookies()).some((cookie) => cookie.name === 'access_token')).toBe(true);
  });

  test('өөр DB-ийн эсвэл хүчингүй сесс үлдсэн бол cookie цэвэрлэгдэж, нэвтрэх хуудас гацалгүй гарна', async ({ page, context, baseURL }) => {
    const domain = new URL(baseURL ?? 'http://localhost:3001').hostname;
    await context.addCookies([
      { name: 'lf_session', value: '1', domain, path: '/' },
      { name: 'access_token', value: 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ4Iiwicm9sZSI6IkNMSUVOVCJ9.x', domain, path: '/' },
      { name: 'refresh_token', value: 'stale-token', domain, path: '/auth' },
    ]);

    await page.goto('/portal');
    await expect(page).toHaveURL(/\/portal\/login/);
    await expect(page.locator('input[name="identifier"]')).toBeVisible();
    await expect(page.getByText('Нэвтрэх хуудас руу шилжүүлж байна…')).toHaveCount(0);
    expect((await context.cookies()).map((cookie) => cookie.name)).not.toContain('lf_session');

    await page.locator('input[name="identifier"]').fill(CLIENT1.identifier);
    await page.locator('input[name="password"]').fill(CLIENT1.password);
    await page.getByRole('button', { name: 'Нэвтрэх', exact: true }).click();
    await expect(page).toHaveURL(/\/portal$/);
  });
});
