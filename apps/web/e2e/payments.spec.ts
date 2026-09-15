import { type APIRequestContext, type Browser, type Page, expect, test } from '@playwright/test';
import { ADMIN, CLIENT1, CLIENT2, LAWYER1, apiAs, createCaseForClient1, login } from './fixtures';

const uniqueId = () => Date.now().toString(36);

/** A fresh SENT invoice on a fresh case for client1 (created by lawyer1). */
async function createSentInvoice(lawyerApi: APIRequestContext, label: string): Promise<{ id: string; invoiceNumber: string }> {
  const created = await createCaseForClient1(lawyerApi, `E2E төлбөр ${label}`);
  const res = await lawyerApi.post('/invoices', {
    data: { caseId: created.id, amount: 450000, description: `Зөвлөгөө ${label}`, dueDate: new Date(Date.now() + 7 * 86_400_000).toISOString() },
  });
  expect(res.status()).toBe(201);
  const invoice = (await res.json()) as { id: string; invoiceNumber: string };
  expect((await lawyerApi.patch(`/invoices/${invoice.id}`, { data: { status: 'SENT' } })).ok()).toBeTruthy();
  return invoice;
}

async function staffPage(browser: Browser, baseURL: string | undefined): Promise<Page> {
  const context = await browser.newContext({ baseURL });
  const page = await context.newPage();
  await login(page, ADMIN);
  return page;
}

async function reportPayment(page: Page, invoiceId: string, note?: string) {
  await page.goto(`/portal/invoices/${invoiceId}`);
  await page.getByRole('button', { name: 'Төлбөр төлөх' }).click();
  const dialog = page.getByRole('dialog', { name: 'Төлбөрийн заавар' });
  await expect(dialog.getByText('Хаан банк')).toBeVisible();
  await expect(dialog.getByText('5023 1188 22')).toBeVisible();
  if (note) await dialog.getByLabel(/^Гүйлгээний мэдээлэл/).fill(note);
  await dialog.getByRole('button', { name: 'Төлбөр хийсэн' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText('Таны төлбөрийг хянаж байна')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Баталгаажуулж байна' })).toBeDisabled();
}

test.describe('Нэхэмжлэхийн төлбөр', () => {
  test('CLIENT төлсөн гэж тэмдэглэх → AWAITING_CONFIRMATION → ADMIN баталгаажуулах → CLIENT талд PAID', async ({ page, browser }, testInfo) => {
    const id = uniqueId();
    const lawyerApi = await apiAs(LAWYER1);
    const invoice = await createSentInvoice(lawyerApi, id);
    await lawyerApi.dispose();

    await login(page, CLIENT1);
    await reportPayment(page, invoice.id, `Хаан банк, 450 000₮, утга ${invoice.invoiceNumber}`);

    // Admin sees it waiting, with the client's note, and confirms.
    const admin = await staffPage(browser, testInfo.project.use.baseURL);
    await admin.goto('/admin/invoices');
    await admin.getByRole('button', { name: 'Шүүж харах' }).click();
    const row = admin.getByRole('row').filter({ hasText: invoice.invoiceNumber });
    await expect(row.getByText('Баталгаажуулж буй')).toBeVisible();
    await row.getByRole('link', { name: 'Төлбөр шалгах' }).click();
    await expect(admin.getByText(`Хаан банк, 450 000₮, утга ${invoice.invoiceNumber}`)).toBeVisible();
    await admin.getByRole('button', { name: 'Төлбөр баталгаажуулах' }).click();
    await expect(admin.getByText('Төлбөр баталгаажсан')).toBeVisible();
    await expect(admin.getByText('Баталгаажуулсан')).toBeVisible();

    // The client sees PAID and gets notified.
    await page.reload();
    await expect(page.getByText('Төлөгдсөн', { exact: true }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Төлбөр төлөх' })).toHaveCount(0);
    const clientApi = await apiAs(CLIENT1);
    const { items } = (await (await clientApi.get('/notifications')).json()) as { items: { title: string }[] };
    expect(items.map((item) => item.title)).toContain(`Төлбөр баталгаажлаа: ${invoice.invoiceNumber}`);
    await clientApi.dispose();
    await admin.context().close();
  });

  test('татгалзах → SENT болж шалтгаан харагдах → CLIENT дахин тэмдэглэх', async ({ page, browser }, testInfo) => {
    const id = uniqueId();
    const reason = 'Дүн зөрсөн: 400 000₮ орсон байна';
    const lawyerApi = await apiAs(LAWYER1);
    const invoice = await createSentInvoice(lawyerApi, id);
    await lawyerApi.dispose();

    await login(page, CLIENT1);
    await reportPayment(page, invoice.id);

    const admin = await staffPage(browser, testInfo.project.use.baseURL);
    await admin.goto(`/admin/invoices/${invoice.id}`);
    await admin.getByRole('button', { name: 'Татгалзах' }).click();
    const dialog = admin.getByRole('dialog', { name: 'Төлбөр татгалзах' });
    await dialog.getByRole('button', { name: 'Татгалзах' }).click();
    await expect(dialog.getByText('Татгалзах шалтгааныг бичнэ үү')).toBeVisible();
    await dialog.getByLabel(/^Татгалзах шалтгаан/).fill(reason);
    await dialog.getByRole('button', { name: 'Татгалзах' }).click();
    await expect(dialog).toBeHidden();
    await expect(admin.getByText('Сүүлд татгалзсан')).toBeVisible();

    // Back to SENT: the client sees the reason and can report again.
    await page.reload();
    await expect(page.getByRole('alert').filter({ hasText: 'Төлбөр баталгаажсангүй' })).toContainText(reason);
    await reportPayment(page, invoice.id, 'Зөрүүг нэмж шилжүүлсэн');

    await admin.reload();
    await expect(admin.getByText('Харилцагч төлбөр хийсэн гэж тэмдэглэсэн')).toBeVisible();
    await expect(admin.getByText('Зөрүүг нэмж шилжүүлсэн')).toBeVisible();
    await admin.context().close();
  });

  test('өөр харилцагч тэмдэглэж, CLIENT баталгаажуулж чадахгүй (403); ноорог нэхэмжлэх 400', async () => {
    const lawyerApi = await apiAs(LAWYER1);
    const invoice = await createSentInvoice(lawyerApi, uniqueId());
    const draftCase = await createCaseForClient1(lawyerApi, `E2E ноорог ${uniqueId()}`);
    const draft = (await (await lawyerApi.post('/invoices', {
      data: { caseId: draftCase.id, amount: 1000, description: 'Ноорог нэхэмжлэх', dueDate: new Date(Date.now() + 86_400_000).toISOString() },
    })).json()) as { id: string };
    await lawyerApi.dispose();

    const otherClient = await apiAs(CLIENT2);
    expect((await otherClient.post(`/invoices/${invoice.id}/mark-paid`, { data: {} })).status()).toBe(403);
    await otherClient.dispose();

    const client = await apiAs(CLIENT1);
    expect((await client.post(`/invoices/${draft.id}/mark-paid`, { data: {} })).status()).toBe(400);
    expect((await client.post(`/invoices/${invoice.id}/mark-paid`, { data: {} })).status()).toBe(200);
    expect((await client.post(`/invoices/${invoice.id}/confirm-payment`, { data: {} })).status()).toBe(403);
    await client.dispose();
  });
});
