import { type APIRequestContext, type Locator, type Page, expect, request as playwrightRequest, test } from '@playwright/test';
import { ADMIN, API_URL, CLIENT2, LAWYER1, LAWYER2, apiAs, login } from './fixtures';

const uniqueId = () => Date.now().toString(36);
const DESCRIPTION = 'Ажил олгогч урьдчилан мэдэгдэлгүйгээр хөдөлмөрийн гэрээг цуцалсан тул нөхөн олговор нэхэмжлэхийг хүсэж байна.';

type RequestItem = { id: string; status: string; assignedCase: { id: string; caseNumber: string } | null };

/** Form labels carry a trailing required marker (" *"), so match on the prefix. */
const field = (scope: Page | Locator, label: string) => scope.getByLabel(new RegExp(`^${label}`));

async function createRequest(clientApi: APIRequestContext, title: string, type: 'LAWYER' | 'CONSULTATION' = 'LAWYER') {
  const res = await clientApi.post('/service-requests', { data: { type, caseType: 'LABOR', title, description: DESCRIPTION } });
  expect(res.status()).toBe(201);
  return (await res.json()) as RequestItem;
}

async function adminPage(browser: import('@playwright/test').Browser, baseURL: string | undefined) {
  const page = await (await browser.newContext({ baseURL })).newPage();
  await login(page, ADMIN);
  return page;
}

test.describe('Үйлчилгээний хүсэлт', () => {
  test('CLIENT хүсэлт илгээх → ADMIN хүлээж аваад нэг өмгөөлөгч хуваарилах → хэрэг нээгдэж CLIENT орох → өмгөөлөгч мессеж бичих', async ({ page, browser, baseURL }) => {
    test.setTimeout(120_000);
    const title = `E2E өмгөөлөгч авах ${uniqueId()}`;

    // CLIENT fills the portal form, reached from the public contact page
    await login(page, CLIENT2);
    await page.goto('/contact');
    await page.getByRole('link', { name: /Өмгөөлөгч авах/ }).click();
    await expect(page).toHaveURL(/\/portal\/requests\/new\?type=LAWYER$/);
    await expect(page.getByRole('radio', { name: /Өмгөөлөгч авах/ })).toHaveAttribute('aria-checked', 'true');
    await field(page, 'Асуудлын чиглэл').click();
    await page.getByRole('option', { name: 'Хөдөлмөрийн маргаан' }).click();
    await field(page, 'Гарчиг').fill(title);
    await field(page, 'Юу болсон бэ').fill('Богино');
    await page.getByRole('button', { name: 'Хүсэлт илгээх' }).click();
    await expect(page.getByText(/дор хаяж 30 тэмдэгтээр/)).toBeVisible();
    await field(page, 'Юу болсон бэ').fill(DESCRIPTION);
    await page.getByRole('button', { name: 'Хүсэлт илгээх' }).click();
    await expect(page).toHaveURL(/\/portal\/requests$/);
    const card = page.locator('li').filter({ hasText: title });
    await expect(card.getByText('Хүсэлтийг хянаж байна')).toBeVisible();

    // ADMIN sees it highlighted in the list, accepts it and assigns lawyer1
    const admin = await adminPage(browser, baseURL);
    await admin.goto('/admin/requests');
    await admin.getByRole('link', { name: title }).filter({ visible: true }).click();
    await expect(admin.getByRole('heading', { name: title })).toBeVisible();
    await admin.getByRole('button', { name: 'Хүлээж авах' }).click();
    await expect(admin.getByText('Хүлээж авсан — өмгөөлөгч хуваарилаагүй')).toBeVisible();
    await admin.getByRole('button', { name: 'Өмгөөлөгч хуваарилах' }).click();
    const dialog = admin.getByRole('dialog', { name: 'Өмгөөлөгч хуваарилах' });
    await dialog.getByRole('button', { name: 'Хуваарилж хэрэг нээх' }).click();
    await expect(dialog.getByRole('alert')).toHaveText('Өмгөөлөгч эсвэл баг сонгоно уу');
    await dialog.getByRole('radio', { name: /Энхжаргал/ }).click();
    await dialog.getByRole('button', { name: 'Хуваарилж хэрэг нээх' }).click();
    await expect(dialog).toBeHidden();
    const caseLink = admin.getByRole('link', { name: /^LF-\d{4}-\d{4} · / });
    await expect(caseLink).toBeVisible();

    const adminApi = await apiAs(ADMIN);
    const requests = (await (await adminApi.get('/service-requests?limit=50')).json()) as { items: (RequestItem & { title: string })[] };
    const converted = requests.items.find((item) => item.title === title)!;
    expect(converted).toMatchObject({ status: 'CONVERTED' });
    const caseId = converted.assignedCase!.id;
    const opened = (await (await adminApi.get(`/cases/${caseId}`)).json()) as { lawyer: { firstName: string }; client: { email: string } };
    expect(opened.lawyer.firstName).toBe('Энхжаргал');
    expect(opened.client.email).toBe(CLIENT2.identifier);

    // CLIENT follows «Хэрэг рүү очих» and the lawyer writes on the new case
    await page.reload();
    await card.getByRole('link', { name: 'Хэрэг рүү очих' }).click();
    await expect(page).toHaveURL(new RegExp(`/portal/cases/${caseId}$`));
    await expect(page.getByRole('heading', { name: title })).toBeVisible();

    const lawyerApi = await apiAs(LAWYER1);
    const body = `Сайн байна уу, таны хэргийг хариуцна ${uniqueId()}`;
    expect((await lawyerApi.post(`/cases/${caseId}/messages`, { data: { body } })).status()).toBe(201);
    await page.goto(`/portal/cases/${caseId}?tab=messages`);
    await expect(page.getByText(body)).toBeVisible();

    const clientApi = await apiAs(CLIENT2);
    const notes = (await (await clientApi.get('/notifications?limit=20')).json()) as { items: { title: string; link: string | null }[] };
    expect(notes.items).toContainEqual(expect.objectContaining({ title: 'Таны хүсэлтэд өмгөөлөгч томилогдлоо, хэрэг нээгдлээ', link: `/portal/cases/${caseId}` }));
  });

  test('ADMIN шалтгаантай татгалзахад CLIENT талд шалтгаан харагдана; шалтгаангүй татгалзах боломжгүй', async ({ page, browser, baseURL }) => {
    const title = `E2E зөвлөгөө ${uniqueId()}`;
    const reason = `Энэ чиглэлээр манай фирм үйлчилгээ үзүүлдэггүй ${uniqueId()}`;
    const clientApi = await apiAs(CLIENT2);
    const created = await createRequest(clientApi, title, 'CONSULTATION');

    const admin = await adminPage(browser, baseURL);
    await admin.goto(`/admin/requests/${created.id}`);
    await admin.getByRole('button', { name: 'Татгалзах' }).click();
    const dialog = admin.getByRole('dialog', { name: 'Хүсэлтийг татгалзах' });
    await dialog.getByRole('button', { name: 'Татгалзах' }).click();
    await expect(dialog.getByText('Татгалзах шалтгааныг бичнэ үү')).toBeVisible();
    await field(dialog, 'Татгалзах шалтгаан').fill(reason);
    await dialog.getByRole('button', { name: 'Татгалзах' }).click();
    await expect(dialog).toBeHidden();
    await expect(admin.getByText(reason)).toBeVisible();
    await expect(admin.getByRole('button', { name: 'Хүлээж авах' })).toHaveCount(0);

    await login(page, CLIENT2);
    await page.goto('/portal/requests');
    const card = page.locator('li').filter({ hasText: title });
    await expect(card.getByText('Хүсэлтийг татгалзсан')).toBeVisible();
    await expect(card.getByText(`Шалтгаан: ${reason}`)).toBeVisible();

    const notes = (await (await clientApi.get('/notifications?limit=20')).json()) as { items: { title: string; body: string }[] };
    expect(notes.items).toContainEqual(expect.objectContaining({ title: 'Таны хүсэлтийг татгалзлаа', body: `${title} · Шалтгаан: ${reason}` }));
    // A decided request cannot be decided again
    expect((await (await apiAs(ADMIN)).post(`/service-requests/${created.id}/accept`)).status()).toBe(400);
  });

  test('багаар хуваарилахад ахлах болон гишүүн хэрэгт хандана, багийн бус хуульч хандахгүй', async ({ browser, baseURL }) => {
    const id = uniqueId();
    const title = `E2E багийн хүсэлт ${id}`;
    const adminApi = await apiAs(ADMIN);
    const created = await createRequest(await apiAs(CLIENT2), title);
    expect((await adminApi.post(`/service-requests/${created.id}/accept`)).status()).toBe(200);

    const admin = await adminPage(browser, baseURL);
    await admin.goto(`/admin/requests/${created.id}`);
    await admin.getByRole('button', { name: 'Өмгөөлөгч хуваарилах' }).click();
    const dialog = admin.getByRole('dialog', { name: 'Өмгөөлөгч хуваарилах' });
    await dialog.getByRole('radio', { name: 'Баг' }).click();
    await dialog.getByRole('checkbox', { name: /Энхжаргал/ }).click();
    await dialog.getByRole('checkbox', { name: /Оюунбилэг/ }).click();
    await dialog.getByRole('button', { name: 'Ахлах болгох' }).click(); // Энхжаргал leads by default; hand the lead to Оюунбилэг
    await dialog.getByRole('button', { name: 'Хуваарилж хэрэг нээх' }).click();
    await expect(dialog).toBeHidden();
    await expect(admin.getByRole('link', { name: /^LF-\d{4}-\d{4} · / })).toBeVisible();

    const converted = (await (await adminApi.get(`/service-requests/${created.id}`)).json()) as RequestItem;
    const caseId = converted.assignedCase!.id;
    const members = (await (await adminApi.get(`/cases/${caseId}/members`)).json()) as { role: string; user: { firstName: string } }[];
    expect(members.map((member) => [member.user.firstName, member.role]).sort()).toEqual([['Оюунбилэг', 'LEAD'], ['Энхжаргал', 'MEMBER']]);
    expect((await (await apiAs(LAWYER1)).get(`/cases/${caseId}`)).status()).toBe(200);
    expect((await (await apiAs(LAWYER2)).get(`/cases/${caseId}`)).status()).toBe(200);

    // A lawyer outside the team cannot open the case
    const outsider = await adminApi.post('/users', {
      data: { email: `e2e.sr.${id}@lawfirm.mn`, firstName: 'Гадны', lastName: `Хуульч${id}`, role: 'LAWYER', password: 'Lawyer123!' },
    });
    expect(outsider.status()).toBe(201);
    const outsiderBody = (await outsider.json()) as { id?: string; user?: { id: string } };
    const outsiderId = outsiderBody.user?.id ?? outsiderBody.id!;
    try {
      const outsiderApi = await apiAs({ identifier: `e2e.sr.${id}@lawfirm.mn`, password: 'Lawyer123!' });
      expect((await outsiderApi.get(`/cases/${caseId}`)).status()).toBe(403);
    } finally {
      await adminApi.patch(`/users/${outsiderId}`, { data: { isActive: false } });
    }
  });

  test('эрх: LAWYER хүсэлтийг удирдахгүй, CLIENT шийдвэр гаргахгүй; нэвтрээгүй зочин /contact-оос нэвтрээд форм руу буцна', async ({ page, browser, baseURL }) => {
    const clientApi = await apiAs(CLIENT2);
    const lawyerApi = await apiAs(LAWYER1);
    const created = await createRequest(clientApi, `E2E эрхийн шалгалт ${uniqueId()}`);
    expect((await lawyerApi.get('/service-requests')).status()).toBe(403);
    expect((await lawyerApi.get(`/service-requests/${created.id}`)).status()).toBe(403);
    expect((await lawyerApi.post('/service-requests', { data: { type: 'LAWYER', caseType: 'CIVIL', title: 'Хуульчийн хүсэлт', description: DESCRIPTION } })).status()).toBe(403);
    expect((await clientApi.post(`/service-requests/${created.id}/accept`)).status()).toBe(403);
    expect((await clientApi.post(`/service-requests/${created.id}/assign`, { data: { lawyerId: created.id } })).status()).toBe(403);
    const anonymous = await playwrightRequest.newContext({ baseURL: API_URL });
    expect((await anonymous.post('/service-requests', { data: { type: 'LAWYER', caseType: 'CIVIL', title: 'Нэвтрээгүй', description: DESCRIPTION } })).status()).toBe(401);
    await anonymous.dispose();

    // Signed out: «Зөвлөгөө авах» → sign in → back on the form with the type chosen
    await page.goto('/contact');
    // The header CTA «Зөвлөгөө авах» only links back to /contact; the request cards live in the main content.
    await page.getByRole('main').getByRole('link', { name: /^Зөвлөгөө авах/ }).click();
    await expect(page).toHaveURL(/\/portal\/login\?next=/);
    await page.locator('input[name="identifier"]').fill(CLIENT2.identifier);
    await page.locator('input[name="password"]').fill(CLIENT2.password);
    await page.getByRole('button', { name: 'Нэвтрэх', exact: true }).click();
    await expect(page).toHaveURL(/\/portal\/requests\/new\?type=CONSULTATION$/);
    await expect(page.getByRole('radio', { name: /Зөвлөгөө авах/ })).toHaveAttribute('aria-checked', 'true');

    // The old admin contact page now leads to the requests list; lawyers have no «Хүсэлтүүд» menu
    const lawyerPage = await (await browser.newContext({ baseURL })).newPage();
    await login(lawyerPage, LAWYER1);
    await expect(lawyerPage.getByRole('link', { name: 'Хүсэлтүүд', exact: true })).toHaveCount(0);
    await lawyerPage.goto('/admin/contact');
    await expect(lawyerPage).toHaveURL(/\/admin\/requests$/);
    await expect(lawyerPage.getByText('403 — Энэ хэсэг зөвхөн админд')).toBeVisible();
  });
});
