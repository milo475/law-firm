import { expect, test } from '@playwright/test';

test.describe('Нийтийн сайт', () => {
  test('нүүр хуудас ачаалагдана', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Тулгуур/);
    await expect(page.getByRole('heading', { level: 1, name: 'Таны эрхийг хамгаалах бат бөх тулгуур' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Бид ямар асуудлыг шийдвэрлэдэг вэ?' })).toBeVisible();
    // 6 service cards, each linking to its detail page
    await expect(page.locator('main a[href^="/services/"]:visible')).toHaveCount(6);
    // API-backed sections: lawyers + latest news
    await expect(page.getByRole('heading', { name: 'Таны хэргийг хариуцах мэргэжилтнүүд' })).toBeVisible();
    await expect(page.locator('main a[href^="/lawyers/"]:visible').first()).toBeVisible();
    await expect(page.locator('main a[href^="/news/"]:visible').first()).toBeVisible();
    await expect(page.locator('footer').getByText('Тулгуур Хуулийн Фирм ХХК').first()).toBeVisible();
  });

  test('мэдээ хайлт ба ангиллын шүүлт ажиллана', async ({ page }) => {
    // Distinct article URLs visible in the list (the featured tile and the cards both link to posts).
    const visibleArticles = () =>
      page.locator('main a[href^="/news/"]:visible').evaluateAll((links) => new Set(links.map((a) => a.getAttribute('href'))).size);
    const articleTitles = page.locator('main h3:visible');

    await page.goto('/news');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Мэдээ');
    await expect(page.locator('main a[href^="/news/"]:visible').first()).toBeVisible();
    const allCount = await visibleArticles();

    // category filter via URL search param
    await page.getByRole('navigation', { name: 'Ангилал' }).getByRole('link', { name: /шинэчлэл/i }).click();
    await expect(page).toHaveURL(/category=LEGAL_UPDATE/);
    await expect.poll(visibleArticles).toBe(2);
    expect(allCount).toBeGreaterThan(2);

    // search (across all categories) — submitted with Enter, as in the design
    await page.goto('/news');
    const search = page.getByRole('searchbox', { name: 'Нийтлэл хайх' });
    await search.fill('хөдөлмөр');
    await search.press('Enter');
    await expect(page).toHaveURL(/search=/);
    await expect(page.getByText('хайлтын үр дүн')).toBeVisible();
    await expect.poll(visibleArticles).toBe(1);
    await expect(articleTitles.first()).toContainText('Хөдөлмөрийн');
  });
});
