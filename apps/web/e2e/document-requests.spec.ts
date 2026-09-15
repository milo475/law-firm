import { type Browser, type Page, expect, test } from '@playwright/test';
import { CLIENT1, CLIENT2, LAWYER1, apiAs, createCaseForClient1, login } from './fixtures';

const uniqueId = () => Date.now().toString(36);
const pdf = (name: string) => ({ name, mimeType: 'application/pdf', buffer: Buffer.from(`%PDF-1.4 ${name}`) });

async function clientPage(browser: Browser, baseURL: string | undefined): Promise<Page> {
  const context = await browser.newContext({ baseURL });
  const page = await context.newPage();
  await login(page, CLIENT1);
  return page;
}

test.describe('Баримтын хүсэлт', () => {
  test('LAWYER баримт хүсэх → CLIENT порталд харж файл илгээх → LAWYER батлах → CLIENT талд батлагдсан', async ({ page, browser }, testInfo) => {
    const id = uniqueId();
    const title = `Иргэний үнэмлэхний хуулбар ${id}`;
    const lawyerApi = await apiAs(LAWYER1);
    const created = await createCaseForClient1(lawyerApi, `E2E баримтын хүсэлт ${id}`);
    await lawyerApi.dispose();

    // Lawyer asks for the document from the case page.
    await login(page, LAWYER1);
    await page.goto(`/admin/cases/${created.id}?tab=requests`);
    await expect(page.getByRole('tab', { name: /Баримтын хүсэлт/, selected: true })).toBeVisible();
    await page.getByRole('button', { name: 'Баримт хүсэх' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel(/^Баримтын нэр/).fill(title);
    await dialog.getByLabel(/^Нэмэлт заавар/).fill('Хоёр талын тод хуулбар');
    await dialog.getByRole('button', { name: 'Хүсэлт илгээх' }).click();
    await expect(dialog).toBeHidden();
    const lawyerCard = page.getByRole('listitem', { name: title });
    await expect(lawyerCard.getByText('Хүлээгдэж буй')).toBeVisible();

    // Client sees it in the portal and sends a file.
    const client = await clientPage(browser, testInfo.project.use.baseURL);
    await client.goto(`/portal/cases/${created.id}?tab=requests`);
    const clientItem = client.getByRole('listitem', { name: title });
    await expect(clientItem.getByText('Илгээгээгүй')).toBeVisible();
    await clientItem.getByLabel(/файл сонгох$/).setInputFiles(pdf('unemleh.pdf'));
    await clientItem.getByRole('button', { name: 'Илгээх (1)' }).click();
    await expect(clientItem.getByText('Хянагдаж байна — хуульч')).toBeVisible();

    // Lawyer sees the submission and approves it.
    await page.reload();
    await expect(lawyerCard.getByText('Илгээсэн', { exact: true })).toBeVisible();
    await expect(lawyerCard.getByText('unemleh.pdf')).toBeVisible();
    await lawyerCard.getByRole('button', { name: 'Батлах' }).click();
    await expect(lawyerCard.getByText('Батлагдсан')).toBeVisible();

    // Client sees the approval.
    await client.reload();
    await expect(clientItem.getByText('Хүлээн авсан', { exact: true })).toBeVisible();
    await expect(clientItem.getByText('Хуульч баримтыг хүлээн авсан')).toBeVisible();
    await client.context().close();
  });

  test('LAWYER буцаах (шалтгаантай) → CLIENT шалтгааныг харж дахин илгээх → LAWYER талд дахин SUBMITTED', async ({ page, browser }, testInfo) => {
    const id = uniqueId();
    const title = `Банкны хуулга ${id}`;
    const reason = 'Хуулга бүдэг байна, тод хуулбар илгээнэ үү';
    const lawyerApi = await apiAs(LAWYER1);
    const created = await createCaseForClient1(lawyerApi, `E2E буцаах урсгал ${id}`);
    const res = await lawyerApi.post(`/cases/${created.id}/document-requests`, { data: { items: [{ title }] } });
    expect(res.status()).toBe(201);
    await lawyerApi.dispose();

    const client = await clientPage(browser, testInfo.project.use.baseURL);
    await client.goto(`/portal/cases/${created.id}?tab=requests`);
    const clientItem = client.getByRole('listitem', { name: title });
    await clientItem.getByLabel(/файл сонгох$/).setInputFiles(pdf('hulga.pdf'));
    await clientItem.getByRole('button', { name: 'Илгээх (1)' }).click();
    await expect(clientItem.getByText('Хянагдаж байна — хуульч')).toBeVisible();

    // Lawyer rejects: the reason is mandatory.
    await login(page, LAWYER1);
    await page.goto(`/admin/cases/${created.id}?tab=requests`);
    const lawyerCard = page.getByRole('listitem', { name: title });
    await lawyerCard.getByRole('button', { name: 'Буцаах' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: 'Буцаах' }).click();
    await expect(dialog.getByText('Буцаах шалтгааныг бичнэ үү')).toBeVisible();
    await dialog.getByLabel(/^Буцаах шалтгаан/).fill(reason);
    await dialog.getByRole('button', { name: 'Буцаах' }).click();
    await expect(dialog).toBeHidden();
    await expect(lawyerCard.getByText('Буцаагдсан', { exact: true })).toBeVisible();

    // Client sees the reason and sends a new file.
    await client.reload();
    await expect(clientItem.getByRole('alert')).toContainText(reason);
    await clientItem.getByLabel(/файл сонгох$/).setInputFiles(pdf('hulga-tod.pdf'));
    await clientItem.getByRole('button', { name: 'Дахин илгээх (1)' }).click();
    await expect(clientItem.getByText('Хянагдаж байна — хуульч')).toBeVisible();
    await expect(clientItem.getByRole('alert')).toHaveCount(0);

    // Lawyer sees it submitted again, with both files.
    await page.reload();
    await expect(lawyerCard.getByText('Илгээсэн', { exact: true })).toBeVisible();
    await expect(lawyerCard.getByText('hulga-tod.pdf')).toBeVisible();
    await expect(lawyerCard.getByRole('button', { name: 'Батлах' })).toBeVisible();
    await client.context().close();
  });

  test('өөр харилцагч хүсэлтэд файл илгээж чадахгүй (403), хэргийг нь ч нээж чадахгүй', async ({ page }) => {
    const lawyerApi = await apiAs(LAWYER1);
    const created = await createCaseForClient1(lawyerApi, `E2E эрхийн шалгалт ${uniqueId()}`);
    const res = await lawyerApi.post(`/cases/${created.id}/document-requests`, { data: { items: [{ title: 'Гэрчилгээний хуулбар' }] } });
    const [request] = (await res.json()) as { id: string }[];
    await lawyerApi.dispose();

    const otherClient = await apiAs(CLIENT2);
    const submit = await otherClient.post(`/document-requests/${request.id}/submit`, { multipart: { files: pdf('huurmag.pdf') } });
    expect(submit.status()).toBe(403);
    expect((await otherClient.get(`/cases/${created.id}/document-requests`)).status()).toBe(403);
    await otherClient.dispose();

    await login(page, CLIENT2);
    await page.goto(`/portal/cases/${created.id}?tab=requests`);
    await expect(page.getByRole('alert').filter({ hasText: '403' })).toBeVisible();
  });
});
