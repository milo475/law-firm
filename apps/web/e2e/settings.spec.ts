import { type APIRequestContext, expect, request as playwrightRequest, test } from '@playwright/test';
import { ADMIN, API_URL, CLIENT1, LAWYER1, apiAs, createCaseForClient1, login } from './fixtures';

type BankAccount = { bankName: string; accountNumber: string; accountName: string; updatedAt: string | null };
type Firm = { name: string; registrationNumber: string | null; phone: string; email: string; address: string; workingHours: string; updatedAt: string | null };

const inAWeek = () => new Date(Date.now() + 7 * 86_400_000).toISOString();

async function createDraftInvoice(lawyerApi: APIRequestContext, title: string, amount: number, description: string) {
  const created = await createCaseForClient1(lawyerApi, title);
  const res = await lawyerApi.post('/invoices', { data: { caseId: created.id, amount, description, dueDate: inAWeek() } });
  expect(res.status()).toBe(201);
  return (await res.json()) as { id: string; invoiceNumber: string };
}

test.describe('Тохиргоо: төлбөр хүлээн авах данс', () => {
  test('ADMIN хүлээн авагчийг солиход харилцагчийн төлбөрийн зааварт шинэ нэр гарна; буруу дансны дугаар хадгалагдахгүй', async ({ page, browser, baseURL }) => {
    const adminApi = await apiAs(ADMIN);
    const lawyerApi = await apiAs(LAWYER1);
    const original = (await (await adminApi.get('/settings/bank-account')).json()) as BankAccount;
    // Only the account holder changes: payments.spec checks the bank name and number in parallel.
    const newName = `Law Firm ХХН e2e ${Date.now().toString(36)}`;
    try {
      const invoice = await createDraftInvoice(lawyerApi, 'E2E дансны тохиргоо', 120000, 'Дансны тохиргооны шалгалт');
      expect((await lawyerApi.patch(`/invoices/${invoice.id}`, { data: { status: 'SENT' } })).ok()).toBeTruthy();

      await login(page, ADMIN);
      await page.getByRole('link', { name: 'Тохиргоо', exact: true }).first().click();
      await expect(page).toHaveURL(/\/admin\/settings$/);
      // The page also holds the firm details form, so everything is looked up inside the account section.
      const bankCard = page.getByRole('region', { name: 'Төлбөр хүлээн авах данс' });
      const accountNumber = bankCard.getByLabel(/^Дансны дугаар/);
      await expect(accountNumber).toHaveValue(original.accountNumber);

      await accountNumber.fill('5023-ABC');
      await bankCard.getByRole('button', { name: 'Хадгалах' }).click();
      await expect(bankCard.getByText(/Дансны дугаар 6–20 оронтой тоо/)).toBeVisible();
      expect(((await (await adminApi.get('/settings/bank-account')).json()) as BankAccount).accountNumber).toBe(original.accountNumber);

      await accountNumber.fill(original.accountNumber);
      await bankCard.getByLabel(/^Хүлээн авагч/).fill(newName);
      await expect(bankCard.getByLabel('Төлбөрийн зааврын харагдац').getByText(newName)).toBeVisible();
      await bankCard.getByRole('button', { name: 'Хадгалах' }).click();
      await expect(page.getByText('Данс хадгалагдлаа')).toBeVisible();
      await expect(bankCard.getByText(/^Сүүлд хадгалсан:/)).toBeVisible();

      const client = await (await browser.newContext({ baseURL })).newPage();
      await login(client, CLIENT1);
      await client.goto(`/portal/invoices/${invoice.id}`);
      await client.getByRole('button', { name: 'Төлбөр төлөх' }).click();
      await expect(client.getByRole('dialog', { name: 'Төлбөрийн заавар' }).getByText(newName)).toBeVisible();
    } finally {
      const restore = { bankName: original.bankName, accountNumber: original.accountNumber, accountName: original.accountName };
      expect((await adminApi.put('/settings/bank-account', { data: restore })).ok()).toBeTruthy();
    }
  });

  test('LAWYER-т «Тохиргоо» цэс харагдахгүй, хуудас нь 403, PUT 403', async ({ page }) => {
    await login(page, LAWYER1);
    await expect(page.getByRole('link', { name: 'Нэхэмжлэх' }).first()).toBeVisible();
    // exact: the dashboard lists the «E2E дансны тохиргоо» case created by the test above
    await expect(page.getByRole('link', { name: 'Тохиргоо', exact: true })).toHaveCount(0);
    await page.goto('/admin/settings');
    await expect(page.getByText('403 — Энэ хэсэг зөвхөн админд')).toBeVisible();

    const lawyerApi = await apiAs(LAWYER1);
    const res = await lawyerApi.put('/settings/bank-account', { data: { bankName: 'Голомт банк', accountNumber: '1105123456', accountName: 'Хуурамч данс' } });
    expect(res.status()).toBe(403);
  });
});

test.describe('Тохиргоо: фирмийн мэдээлэл', () => {
  test('ADMIN утсыг солиход нийтийн сайтын хөл, «Холбоо барих», нэвтрэх хуудас, нэхэмжлэхийн «Нэхэмжлэгч» дээр шинэ утас гарна', async ({ page, browser, baseURL }) => {
    const adminApi = await apiAs(ADMIN);
    const lawyerApi = await apiAs(LAWYER1);
    const original = (await (await adminApi.get('/settings/firm')).json()) as Firm;
    const suffix = String(Date.now() % 10_000).padStart(4, '0');
    const shown = `+976 9911-${suffix}`;
    const registrationNumber = original.registrationNumber ?? '5190028';
    try {
      const invoice = await createDraftInvoice(lawyerApi, 'E2E фирмийн мэдээлэл', 90000, 'Фирмийн мэдээллийн шалгалт');
      expect((await lawyerApi.patch(`/invoices/${invoice.id}`, { data: { status: 'SENT' } })).ok()).toBeTruthy();

      await login(page, ADMIN);
      await page.goto('/admin/settings');
      const firmCard = page.getByRole('region', { name: 'Фирмийн мэдээлэл' });
      const registration = firmCard.getByLabel(/^Регистрийн дугаар/);
      await registration.fill('519002');
      await firmCard.getByRole('button', { name: 'Хадгалах' }).click();
      await expect(firmCard.getByText('Регистрийн дугаар 7 оронтой тоо байна')).toBeVisible();

      await registration.fill(registrationNumber);
      await firmCard.getByLabel(/^Утас/).fill(`9911 ${suffix}`);
      await firmCard.getByRole('button', { name: 'Хадгалах' }).click();
      await expect(page.getByText('Фирмийн мэдээлэл хадгалагдлаа')).toBeVisible();
      expect(((await (await adminApi.get('/settings/firm')).json()) as Firm).phone).toBe(`9911${suffix}`);

      // Server-rendered pages keep a cached copy; saving from the settings page revalidated it.
      const visitor = await (await browser.newContext({ baseURL })).newPage();
      await expect(async () => {
        await visitor.goto('/contact');
        await expect(visitor.getByRole('contentinfo').getByRole('link', { name: shown })).toBeVisible({ timeout: 2_000 });
        await expect(visitor.getByRole('main').getByRole('link', { name: shown })).toBeVisible({ timeout: 2_000 });
      }).toPass({ timeout: 20_000 });
      await expect(async () => {
        await visitor.goto('/portal/login');
        await expect(visitor.getByText(`Асуудал гарвал: ${shown}`).first()).toBeVisible({ timeout: 2_000 });
      }).toPass({ timeout: 20_000 });

      const client = await (await browser.newContext({ baseURL })).newPage();
      await login(client, CLIENT1);
      await client.goto(`/portal/invoices/${invoice.id}`);
      await expect(client.getByText('Нэхэмжлэгч')).toBeVisible();
      await expect(client.getByText(`РД ${registrationNumber} · ${shown}`)).toBeVisible();
    } finally {
      const restore = { name: original.name, registrationNumber, phone: original.phone, email: original.email, address: original.address, workingHours: original.workingHours };
      expect((await adminApi.put('/settings/firm', { data: restore })).ok()).toBeTruthy();
      // Drop the cached public copy again so later specs and screenshots see the restored phone.
      await page.request.post('/api/revalidate/firm');
    }
  });

  test('GET /settings/firm нэвтрэлтгүй ажиллана; LAWYER-ийн PUT 403, кэш цэвэрлэх route зөвхөн ADMIN-д', async ({ page }) => {
    const anonymous = await playwrightRequest.newContext({ baseURL: API_URL });
    const firm = await anonymous.get('/settings/firm');
    expect(firm.status()).toBe(200);
    const details = (await firm.json()) as Firm;
    await anonymous.dispose();

    const lawyerApi = await apiAs(LAWYER1);
    const body = { name: details.name, registrationNumber: '5190028', phone: '99110000', email: details.email, address: details.address, workingHours: details.workingHours };
    expect((await lawyerApi.put('/settings/firm', { data: body })).status()).toBe(403);

    expect((await page.request.post('/api/revalidate/firm')).status()).toBe(401);
    await login(page, LAWYER1);
    expect((await page.request.post('/api/revalidate/firm')).status()).toBe(403);
  });
});

test.describe('Ноорог нэхэмжлэх засах', () => {
  test('ADMIN ноорог нэхэмжлэхийн дүн, тайлбарыг засна; илгээсний дараа «Засах» алга болно', async ({ page }) => {
    const lawyerApi = await apiAs(LAWYER1);
    const invoice = await createDraftInvoice(lawyerApi, 'E2E ноорог засах', 300000, 'Анхны тайлбар');

    await login(page, ADMIN);
    await page.goto(`/admin/invoices/${invoice.id}`);
    await page.getByRole('button', { name: 'Засах' }).click();
    const dialog = page.getByRole('dialog', { name: `${invoice.invoiceNumber} засах` });
    await expect(dialog.getByLabel(/^Дүн/)).toHaveValue('300000');
    await dialog.getByLabel(/^Дүн/).fill('650000');
    await dialog.getByLabel(/^Тайлбар/).fill('Шүүх хуралд төлөөлөх (засварласан)');
    await dialog.getByRole('button', { name: 'Хадгалах' }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByText('Шүүх хуралд төлөөлөх (засварласан)')).toBeVisible();
    await expect(page.getByText(/650[\s  ]?000/).first()).toBeVisible();
    expect(Number(((await (await lawyerApi.get(`/invoices/${invoice.id}`)).json()) as { amount: string }).amount)).toBe(650000);

    await page.getByRole('button', { name: 'Илгээх' }).click();
    await expect(page.getByRole('button', { name: 'Засах' })).toHaveCount(0);
    expect(((await (await lawyerApi.get(`/invoices/${invoice.id}`)).json()) as { status: string }).status).toBe('SENT');
  });
});
