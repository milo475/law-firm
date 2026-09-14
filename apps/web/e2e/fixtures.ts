import { type Page, expect } from '@playwright/test';

export const CLIENT1 = { identifier: 'client1@example.mn', password: 'Client123!' };
export const CLIENT2 = { identifier: 'client2@example.mn', password: 'Client123!' };

export async function login(page: Page, user = CLIENT1) {
  await page.goto('/portal/login');
  await page.locator('input[name="identifier"]').fill(user.identifier);
  await page.locator('input[name="password"]').fill(user.password);
  await page.getByRole('button', { name: 'Нэвтрэх' }).click();
  await expect(page).toHaveURL(/\/portal$/);
}
