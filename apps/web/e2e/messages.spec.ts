import { expect, test } from '@playwright/test';
import { CLIENT1, CLIENT2, LAWYER1, LAWYER2, apiAs, createCaseForClient1, login } from './fixtures';

const uniqueId = () => Date.now().toString(36);

test.describe('Хэргийн мессеж', () => {
  test('CLIENT мессеж илгээх → LAWYER талд харагдаж мэдэгдэл очих → LAWYER хариулах → CLIENT талд харагдах', async ({ page, browser }, testInfo) => {
    const id = uniqueId();
    const question = `Хурлын өмнө уулзаж болох уу? ${id}`;
    const reply = `Баасан гарагт 14 цагт уулзъя. ${id}`;
    const lawyerApi = await apiAs(LAWYER1);
    const created = await createCaseForClient1(lawyerApi, `E2E мессеж ${id}`);

    // Client starts the conversation from the case chat tab.
    await login(page, CLIENT1);
    await page.goto(`/portal/cases/${created.id}?tab=messages`);
    const clientThread = page.getByRole('region', { name: 'Мессеж' });
    await expect(clientThread.getByText('Харилцаа эхлүүлэх')).toBeVisible();
    await clientThread.getByLabel('Мессеж бичих').fill(question);
    await clientThread.getByLabel('Мессеж бичих').press('Enter');
    await expect(clientThread.getByText(question)).toBeVisible();

    // The lawyer is notified with a link to the admin chat tab.
    const { items: notifications } = (await (await lawyerApi.get('/notifications')).json()) as { items: { title: string; link: string }[] };
    const note = notifications.find((item) => item.link === `/admin/cases/${created.id}?tab=messages`);
    expect(note?.title).toBe(`Шинэ мессеж: ${created.caseNumber}`);
    await lawyerApi.dispose();

    // Lawyer opens the link, sees the question and replies.
    const lawyerContext = await browser.newContext({ baseURL: testInfo.project.use.baseURL });
    const lawyer = await lawyerContext.newPage();
    await login(lawyer, LAWYER1);
    await lawyer.goto(note!.link);
    await expect(lawyer.getByRole('tab', { name: /Мессеж/, selected: true })).toBeVisible();
    const lawyerThread = lawyer.getByRole('region', { name: 'Мессеж' });
    await expect(lawyerThread.getByText(question)).toBeVisible();
    await lawyerThread.getByLabel('Мессеж бичих').fill(reply);
    await lawyerThread.getByRole('button', { name: 'Илгээх' }).click();
    await expect(lawyerThread.getByText(reply)).toBeVisible();

    // The client's open chat picks the reply up by polling.
    await expect(clientThread.getByText(reply)).toBeVisible({ timeout: 15_000 });
    await lawyerContext.close();
  });

  test('уншаагүй тоо inbox-д харагдаж, чатыг нээхэд 0 болно', async ({ page }) => {
    const id = uniqueId();
    const lawyerApi = await apiAs(LAWYER1);
    const created = await createCaseForClient1(lawyerApi, `E2E уншаагүй ${id}`);
    for (const body of [`Эхний мессеж ${id}`, `Хоёр дахь мессеж ${id}`]) {
      expect((await lawyerApi.post(`/cases/${created.id}/messages`, { data: { body } })).status()).toBe(201);
    }
    await lawyerApi.dispose();

    await login(page, CLIENT1);
    await page.goto('/portal/messages');
    const row = page.getByRole('link', { name: new RegExp(created.caseNumber) });
    await expect(row).toContainText(`Хоёр дахь мессеж ${id}`);
    await expect(row.getByLabel('2 уншаагүй')).toBeVisible();

    await row.click();
    await expect(page).toHaveURL(new RegExp(`/portal/cases/${created.id}\\?tab=messages$`));
    await expect(page.getByRole('region', { name: 'Мессеж' }).getByText(`Эхний мессеж ${id}`)).toBeVisible();

    const clientApi = await apiAs(CLIENT1);
    await expect.poll(async () => ((await (await clientApi.get(`/cases/${created.id}/messages/unread-count`)).json()) as { count: number }).count).toBe(0);
    await clientApi.dispose();
  });

  test('хэрэгт хандах эрхгүй хүн мессеж таб, API-аар орж чадахгүй', async ({ page, browser }, testInfo) => {
    const lawyerApi = await apiAs(LAWYER1);
    const created = await createCaseForClient1(lawyerApi, `E2E мессежийн эрх ${uniqueId()}`);
    await lawyerApi.dispose();

    for (const outsider of [CLIENT2, LAWYER2]) {
      const api = await apiAs(outsider);
      expect((await api.get(`/cases/${created.id}/messages`)).status()).toBe(403);
      expect((await api.post(`/cases/${created.id}/messages`, { data: { body: 'Зөвшөөрөлгүй' } })).status()).toBe(403);
      await api.dispose();
    }

    await login(page, CLIENT2);
    await page.goto(`/portal/cases/${created.id}?tab=messages`);
    await expect(page.getByRole('alert').filter({ hasText: '403' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Мессеж' })).toHaveCount(0);

    const lawyerContext = await browser.newContext({ baseURL: testInfo.project.use.baseURL });
    const otherLawyer = await lawyerContext.newPage();
    await login(otherLawyer, LAWYER2);
    await otherLawyer.goto(`/admin/cases/${created.id}?tab=messages`);
    await expect(otherLawyer.getByRole('alert').filter({ hasText: '403' })).toBeVisible();
    await lawyerContext.close();
  });
});
