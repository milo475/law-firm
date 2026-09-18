import { expect, test } from '@playwright/test';

test.describe('Хэл сонголт', () => {
  test('толгой мөрнөөс хэл солиход cookie хадгалагдаж, дахин ачаалахад хэвээр үлдэнэ', async ({ page, context }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'mn-MN');

    // The switcher is in the desktop header (the suite runs at 1440px).
    await page.getByRole('button', { name: 'Хэл сонгох' }).click();
    await page.getByRole('menuitem', { name: 'English' }).click();

    await expect(page).toHaveURL(/\/en$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    const cookie = (await context.cookies()).find((c) => c.name === 'NEXT_LOCALE');
    expect(cookie?.value).toBe('en');

    // A reload keeps the language…
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');

    // …and so does opening the unprefixed URL again (the cookie, not Accept-Language, decides).
    await page.goto('/services');
    await expect(page).toHaveURL(/\/en\/services$/);

    // Untranslated strings fall back to Mongolian until the firm fills messages/en.json.
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Үйлчилгээний чиглэл');

    // Back to Mongolian: the unprefixed URLs work again.
    await page.getByRole('button', { name: 'Хэл сонгох' }).click();
    await page.getByRole('menuitem', { name: 'Монгол' }).click();
    await expect(page).toHaveURL(/\/services$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'mn-MN');
  });

  test('монгол хэл дээрх URL-ууд хэвээр, гурван хэл дээр hreflang холбоостой', async ({ page }) => {
    const response = await page.goto('/about');
    expect(response?.status()).toBe(200);
    await expect(page.locator('html')).toHaveAttribute('lang', 'mn-MN');
    for (const [lang, href] of [['mn-MN', '/about'], ['en', '/en/about'], ['zh-Hans', '/zh/about']] as const) {
      await expect(page.locator(`link[rel="alternate"][hreflang="${lang}"]`)).toHaveAttribute('href', new RegExp(`${href}$`));
    }
    // The article list stays Mongolian in every language, and says so.
    await page.goto('/zh/news');
    await expect(page.locator('html')).toHaveAttribute('lang', 'zh-Hans');
    await expect(page.getByText('Эдгээр нийтлэл монгол хэл дээр байна.')).toBeVisible();
  });
});
