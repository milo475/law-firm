import { expect, test } from '@playwright/test';

test.describe('Нийтийн сайт', () => {
  test('нүүр хуудас ачаалагдана', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Strategy Law Firm/);
    await expect(page.getByRole('heading', { level: 1, name: 'Таны эрхийг хамгаалах бат бөх түшиг' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Бид ямар асуудлыг шийдвэрлэдэг вэ?' })).toBeVisible();
    // 6 service cards, each linking to its detail page
    await expect(page.locator('main a[href^="/services/"]:visible')).toHaveCount(6);
    // API-backed sections: lawyers + latest news
    await expect(page.getByRole('heading', { name: 'Таны хэргийг хариуцах мэргэжилтнүүд' })).toBeVisible();
    await expect(page.locator('main a[href^="/lawyers/"]:visible').first()).toBeVisible();
    await expect(page.locator('main a[href^="/news/"]:visible').first()).toBeVisible();
    await expect(page.locator('footer').getByText('«Strategy Law Firm» ХХК').first()).toBeVisible();
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
    // Right after a server start the page may not be hydrated yet; retry until the client-side search navigates.
    await expect(async () => {
      await search.fill('хөдөлмөр');
      await search.press('Enter');
      await expect(page).toHaveURL(/search=/, { timeout: 2_000 });
    }).toPass({ timeout: 15_000 });
    await expect(page.getByText('хайлтын үр дүн')).toBeVisible();
    await expect.poll(visibleArticles).toBe(1);
    await expect(articleTitles.first()).toContainText('Хөдөлмөрийн');
  });

  test('хуульчдын мэргэшлийн шүүлтүүр түлхүүрээр ажиллаж, хуучин холбоос шилжинэ', async ({ page }) => {
    const cards = page.locator('main a[href^="/lawyers/"]:visible');

    await page.goto('/lawyers');
    const total = await cards.count();
    expect(total).toBeGreaterThan(1);

    // The chip navigates to the ASCII key, not the Mongolian label.
    await page.getByRole('navigation', { name: 'Мэргэшлийн чиглэлээр шүүх' }).getByRole('link', { name: 'Иргэний' }).click();
    await expect(page).toHaveURL(/\/lawyers\?spec=civil$/);
    const civil = await cards.count();
    expect(civil).toBeGreaterThan(0);
    expect(civil).toBeLessThan(total);

    // A different area matches a different set of lawyers.
    await page.goto('/lawyers?spec=family');
    await expect(cards.first()).toBeVisible();
    expect(await cards.count()).toBeLessThan(total);

    // Links shared before the keys existed still work: 308 → the same filtered page.
    const redirect = await page.request.get(`/lawyers?spec=${encodeURIComponent('Иргэний')}`, { maxRedirects: 0 });
    expect(redirect.status()).toBe(308);
    expect(redirect.headers().location).toContain('spec=civil');
    await page.goto(`/lawyers?spec=${encodeURIComponent('Иргэний')}`);
    await expect(page).toHaveURL(/\/lawyers\?spec=civil$/);
    expect(await cards.count()).toBe(civil);

    // An unknown value simply shows everyone.
    await page.goto('/lawyers?spec=zzz');
    expect(await cards.count()).toBe(total);
  });

  test('хөлний хууль зүйн хуудсууд ажиллана', async ({ page }) => {
    await page.goto('/');
    const footer = page.getByRole('contentinfo');
    for (const [label, path] of [['Нууцлалын бодлого', '/privacy'], ['Үйлчилгээний нөхцөл', '/terms']] as const) {
      await footer.getByRole('link', { name: label }).click();
      await expect(page).toHaveURL(new RegExp(`${path}$`));
      await expect(page.getByRole('heading', { name: label })).toBeVisible();
      await expect(page.getByText('Сүүлд шинэчилсэн:')).toBeVisible();
      await page.goBack();
    }
  });
});
