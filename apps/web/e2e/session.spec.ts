import { expect, request as playwrightRequest, test } from '@playwright/test';
import { API_URL, CLIENT1, apiAs, login } from './fixtures';

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

  test('хоёр таб нэг refresh токеныг зэрэг илгээхэд хоёулаа шинэ токен авч, хэрэглэгчийн бусад сесс хаагдахгүй', async () => {
    const otherSession = await apiAs(CLIENT1);
    const signIn = await playwrightRequest.newContext({ baseURL: API_URL });
    expect((await signIn.post('/auth/login', { data: CLIENT1 })).ok()).toBeTruthy();
    const refreshToken = (await signIn.storageState()).cookies.find((cookie) => cookie.name === 'refresh_token')?.value;
    expect(refreshToken, 'login sets the refresh cookie').toBeTruthy();
    await signIn.dispose();

    // The cookie is sent by hand: this context calls the API directly, while the cookie's path
    // follows COOKIE_PATH_PREFIX (/auth, or /api/auth behind the web app's same-origin proxy).
    const refreshWith = async (token: string | undefined) => {
      const tab = await playwrightRequest.newContext({ baseURL: API_URL, extraHTTPHeaders: { cookie: `refresh_token=${token}` } });
      const status = (await tab.post('/auth/refresh')).status();
      await tab.dispose();
      return status;
    };
    // The first tab rotates the token; the second arrives moments later with the same, now rotated, one.
    expect(await refreshWith(refreshToken)).toBe(200);
    expect(await refreshWith(refreshToken)).toBe(200);
    // Not treated as theft: another session of the same user still refreshes.
    const otherToken = (await otherSession.storageState()).cookies.find((cookie) => cookie.name === 'refresh_token')?.value;
    await otherSession.dispose();
    expect(await refreshWith(otherToken)).toBe(200);
  });

  test('хоёр табын access token зэрэг дуусахад хоёр таб хоёулаа порталд үлдэнэ', async ({ browser, baseURL }) => {
    const context = await browser.newContext({ baseURL });
    const first = await context.newPage();
    await login(first, CLIENT1);
    const second = await context.newPage();
    await first.goto('about:blank');
    await context.clearCookies({ name: 'access_token' });

    await Promise.all([first.goto('/portal'), second.goto('/portal')]);
    await expect(first.getByRole('heading', { name: /Сайн байна уу/ })).toBeVisible();
    await expect(second.getByRole('heading', { name: /Сайн байна уу/ })).toBeVisible();
    await context.close();
  });
});
