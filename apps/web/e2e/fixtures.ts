import { type Page, expect } from '@playwright/test';

export const API_URL = process.env.E2E_API_URL ?? 'http://localhost:4000';

export const CLIENT1 = { identifier: 'client1@example.mn', password: 'Client123!' };
export const CLIENT2 = { identifier: 'client2@example.mn', password: 'Client123!' };
export const ADMIN = { identifier: 'admin@lawfirm.mn', password: 'Admin123!' };
/** Д. Энхжаргал — assigned to LF-2026-0001 in the seed. */
export const LAWYER1 = { identifier: 'enkhjargal@lawfirm.mn', password: 'Lawyer123!' };
/** Ц. Оюунбилэг — owns the other seeded cases. */
export const LAWYER2 = { identifier: 'oyunbileg@lawfirm.mn', password: 'Lawyer123!' };

type Credentials = { identifier: string; password: string };

/** Logs in through the portal form. Clients land on /portal, staff on /admin. */
export async function login(page: Page, user: Credentials = CLIENT1) {
  await page.goto('/portal/login');
  await page.locator('input[name="identifier"]').fill(user.identifier);
  await page.locator('input[name="password"]').fill(user.password);
  await page.getByRole('button', { name: 'Нэвтрэх', exact: true }).click();
  const isStaff = user.identifier.endsWith('@lawfirm.mn');
  await expect(page).toHaveURL(isStaff ? /\/admin$/ : /\/portal$/);
}
