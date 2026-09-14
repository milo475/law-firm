import { expect, test } from '@playwright/test';

test.describe('Нийтийн сайт', () => {
  test('нүүр хуудас ачаалагдана', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Тулгуур/);
    await expect(page.getByRole('heading', { level: 1, name: 'Эрх зүйн найдвартай түнш' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Үйлчилгээний чиглэлүүд' })).toBeVisible();
    // 6 service cards
    await expect(page.getByRole('link', { name: 'Дэлгэрэнгүй' })).toHaveCount(6);
    // API-backed sections
    await expect(page.getByRole('heading', { name: 'Хуульчдын баг' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Сүүлийн мэдээ, зөвлөгөө' })).toBeVisible();
    await expect(page.locator('footer').getByText('Тулгуур Хуулийн Фирм ХХК')).toBeVisible();
  });

  test('мэдээ хайлт ба ангиллын шүүлт ажиллана', async ({ page }) => {
    await page.goto('/news');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Мэдээ');
    await page.getByRole('searchbox', { name: 'Нийтлэл хайх' }).fill('хөдөлмөр');
    await page.getByRole('button', { name: 'Хайх' }).click();
    await expect(page).toHaveURL(/search=/);
    await expect(page.getByText('хайлтын үр дүн')).toBeVisible();
    await expect(page.getByRole('heading', { level: 3 }).first()).toContainText('Хөдөлмөрийн');

    await page.getByRole('link', { name: 'Хууль тогтоомжийн шинэчлэл' }).first().click();
    await expect(page).toHaveURL(/category=LEGAL_UPDATE/);
    await expect(page.getByRole('heading', { level: 3 })).toHaveCount(2);
  });
});
