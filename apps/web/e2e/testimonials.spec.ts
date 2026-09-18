import { expect, request as playwrightRequest, test, type APIRequestContext } from '@playwright/test';
import { ADMIN, API_URL, CLIENT1, LAWYER1, apiAs, createCaseForClient1, login } from './fixtures';

/** The public endpoint, straight against the API — no session, as a visitor would see it. */
const publicApi = () => playwrightRequest.newContext({ baseURL: API_URL });

const uniqueId = () => Date.now().toString(36);
// The "E2E " prefix lets `pnpm db:clean` sweep these rows even if their case is gone.
const BODY = 'E2E Хэргийн явцыг эхнээс нь дуустал ойлгомжтой тайлбарлаж, шүүх хуралд итгэлтэй төлөөлсөн. Асуулт болгонд тайван хариулсанд баярлалаа.';

/** A closed case for client1, so the portal offers the testimonial form. */
async function closedCase(lawyerApi: APIRequestContext, title: string) {
  const record = await createCaseForClient1(lawyerApi, title);
  const closed = await lawyerApi.patch(`/cases/${record.id}/close`, { data: {} });
  expect(closed.status()).toBe(200);
  return record;
}

test.describe('Харилцагчийн сэтгэгдэл', () => {
  test('CLIENT порталаас сэтгэгдэл илгээх → ADMIN дээр PENDING → нийтлэх → нүүр хуудсанд гарах', async ({ page, browser, baseURL }) => {
    test.setTimeout(120_000);
    const id = uniqueId();
    const lawyerApi = await apiAs(LAWYER1);
    const record = await closedCase(lawyerApi, `E2E сэтгэгдлийн хэрэг ${id}`);
    const body = `${BODY} (${id})`;

    // ── the client writes it in the portal ─────────────────────────────────
    await login(page, CLIENT1);
    await page.goto(`/portal/cases/${record.id}`);
    await page.getByRole('button', { name: 'Үйлчилгээний талаар сэтгэгдэл үлдээх' }).click();
    await page.getByLabel(/^Таны сэтгэгдэл/).fill(body);
    await page.getByRole('button', { name: '4 од' }).click();

    // The consent box is required: submitting without it keeps the form open.
    await page.getByRole('button', { name: 'Сэтгэгдэл илгээх' }).click();
    await expect(page.getByText('Нэрийг тань нийтлэх зөвшөөрлийг тэмдэглэнэ үү')).toBeVisible();

    await page.getByRole('checkbox', { name: 'Миний нэрийг сайт дээр нийтлэхийг зөвшөөрч байна' }).click();
    await page.getByRole('button', { name: 'Сэтгэгдэл илгээх' }).click();
    await expect(page.getByText('Танай сэтгэгдлийг хүлээн авлаа')).toBeVisible();
    // The case page renders the overview column twice (mobile / desktop); only one is on screen.
    const myCard = page.getByTestId('my-testimonial').filter({ visible: true });
    await expect(myCard).toBeVisible();
    await expect(myCard.getByText('Хянагдаж байна')).toBeVisible();

    // Nothing is public before review.
    const visitor = await publicApi();
    const beforeReview = await visitor.get('/testimonials?limit=50');
    expect(beforeReview.ok()).toBeTruthy();
    expect(JSON.stringify(await beforeReview.json())).not.toContain(id);

    // ── staff review it ────────────────────────────────────────────────────
    const admin = await (await browser.newContext({ baseURL })).newPage();
    await login(admin, ADMIN);
    await admin.goto('/admin/testimonials');
    const row = admin.locator('article', { hasText: body });
    await expect(row).toBeVisible();
    await expect(row.getByText('Хянагдаагүй', { exact: true })).toBeVisible();
    await expect(row.getByText('Порталаас', { exact: true })).toBeVisible();

    await row.getByRole('button', { name: 'Нийтлэх' }).click();
    // Consent was given in the portal, so the dialog opens with the box ticked and the note filled.
    await expect(admin.getByRole('checkbox', { name: /зөвшөөрлийг авсан гэдгийг баталж байна/ })).toBeChecked();
    await admin.getByRole('dialog').getByRole('button', { name: 'Нийтлэх', exact: true }).click();
    await expect(admin.getByText('Нийтлэгдлээ')).toBeVisible();
    await expect(row.getByText('Нийтэлсэн')).toBeVisible();

    // ── the public API and the home page show it ───────────────────────────
    const published = await visitor.get('/testimonials?limit=50');
    const items = (await published.json()) as { body: string; authorName: string }[];
    const mine = items.find((item) => item.body.includes(id));
    expect(mine).toBeTruthy();
    // The public shape carries the agreed name and nothing that identifies the case.
    expect(mine).not.toHaveProperty('caseId');
    expect(mine).not.toHaveProperty('authorUserId');
    expect(JSON.stringify(mine)).not.toContain(record.caseNumber);

    await expect(admin.locator('article', { hasText: body }).getByRole('button', { name: 'Нүүрэнд гаргах' })).toBeVisible();
    await admin.locator('article', { hasText: body }).getByRole('button', { name: 'Нүүрэнд гаргах' }).click();
    await expect(admin.getByText('Хадгаллаа')).toBeVisible();

    await page.goto('/reviews');
    await expect(page.getByText(body)).toBeVisible();
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Харилцагчид юу хэлдэг вэ?' })).toBeVisible();
    await expect(page.getByText(body)).toBeVisible();

    // ── the client takes the permission back ──────────────────────────────
    await page.goto(`/portal/cases/${record.id}`);
    await expect(myCard.getByText('Сайтад нийтлэгдсэн')).toBeVisible();
    await myCard.getByRole('button', { name: 'Нийтлэхийг цуцлах' }).click();
    await expect(page.getByText('Нийтлэхийг цуцаллаа')).toBeVisible();

    const afterRevoke = await visitor.get('/testimonials?limit=50');
    expect(JSON.stringify(await afterRevoke.json())).not.toContain(id);
    await visitor.dispose();

    // A second testimonial about the same case is refused.
    const clientApi = await apiAs(CLIENT1);
    const duplicate = await clientApi.post('/testimonials', { data: { caseId: record.id, body: BODY, consentGiven: true } });
    expect(duplicate.status()).toBe(409);

    await admin.context().close();
  });

  test('сэтгэгдэлгүй үед нүүр, үйлчилгээний хуудас эвдрэхгүй', async ({ page }) => {
    // The seed has no published testimonials, so both pages render without the block.
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.goto('/services/civil');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.goto('/reviews');
    await expect(page.getByRole('heading', { level: 1, name: 'Харилцагчдын сэтгэгдэл' })).toBeVisible();
  });
});
