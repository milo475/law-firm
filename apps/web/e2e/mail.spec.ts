import { createHmac, randomBytes } from 'node:crypto';
import path from 'node:path';
import { config as loadEnv } from 'dotenv';
import { getPrismaClient } from '@law-firm/shared';
import { expect, test } from '@playwright/test';
import { API_URL } from './fixtures';

loadEnv({ path: [path.resolve(__dirname, '../../../.env')] });

const prisma = getPrismaClient();

/**
 * The link that goes out by e-mail is never stored — only a keyed hash of it is — so the suite
 * cannot read a real one out of the database. It writes its own instead, exactly as the API would,
 * which is also the point: the server accepts nothing but a token whose hash it already holds.
 */
function issueToken(userId: string, purpose: 'PASSWORD_RESET' | 'INVITE', ttlMs: number) {
  const secret = process.env.JWT_REFRESH_SECRET as string;
  expect(secret, 'JWT_REFRESH_SECRET is loaded from .env').toBeTruthy();
  const raw = randomBytes(32).toString('base64url');
  const tokenHash = createHmac('sha256', secret).update(raw).digest('hex');
  return {
    raw,
    create: () =>
      prisma.authToken.create({
        data: { userId, purpose, tokenHash, expiresAt: new Date(Date.now() + ttlMs) },
      }),
  };
}

const uniqueId = () => Math.random().toString(36).slice(2, 8);

test.describe('Нууц үг сэргээх ба урилга', () => {
  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  test('сэргээх холбоосоор шинэ нууц үг тавьж, хуучнаар нь нэвтэрч чадахгүй; холбоос дахин ажиллахгүй', async ({ page, request }) => {
    const id = uniqueId();
    const email = `e2e.reset.${id}@lawfirm.mn`;
    const user = await prisma.user.create({
      data: {
        email,
        firstName: 'E2E',
        lastName: 'Сэргээх',
        role: 'CLIENT',
        // argon2 hash of "Client123!" — the account starts with a password that must stop working.
        passwordHash: (await prisma.user.findUniqueOrThrow({ where: { email: 'client1@example.mn' }, select: { passwordHash: true } })).passwordHash,
      },
      select: { id: true },
    });
    const token = issueToken(user.id, 'PASSWORD_RESET', 3_600_000);
    await token.create();

    await page.goto(`/portal/reset-password?token=${encodeURIComponent(token.raw)}`);
    await page.getByLabel('Шинэ нууц үг').fill('BrandNew123');
    await page.getByLabel('Нууц үгээ давтах').fill('BrandNew123');
    await page.getByRole('button', { name: 'Нууц үг тохируулах' }).click();
    // Scoped to the page: the same words appear in the toast.
    await expect(page.getByRole('main').getByText('Нууц үг шинэчлэгдлээ')).toBeVisible();

    // The new password works and the old one does not.
    expect((await request.post(`${API_URL}/auth/login`, { data: { identifier: email, password: 'BrandNew123' } })).ok()).toBeTruthy();
    expect((await request.post(`${API_URL}/auth/login`, { data: { identifier: email, password: 'Client123!' } })).status()).toBe(401);

    // One use only: the same link is refused the second time.
    const reuse = await request.post(`${API_URL}/auth/reset-password`, { data: { token: token.raw, password: 'Another123' } });
    expect(reuse.status()).toBe(400);
    expect((await reuse.json()).code).toBe('auth.linkInvalid');
  });

  test('хугацаа нь дууссан холбоос ажиллахгүй', async ({ request }) => {
    const user = await prisma.user.findUniqueOrThrow({ where: { email: 'client1@example.mn' }, select: { id: true } });
    const token = issueToken(user.id, 'PASSWORD_RESET', -1_000);
    await token.create();

    const res = await request.post(`${API_URL}/auth/reset-password`, { data: { token: token.raw, password: 'Another123' } });
    expect(res.status()).toBe(400);
    await prisma.authToken.deleteMany({ where: { userId: user.id, purpose: 'PASSWORD_RESET' } });
  });

  test('хаяг бүртгэлтэй эсэхээс үл хамааран ижил хариу буцаана', async ({ request }) => {
    const known = await request.post(`${API_URL}/auth/forgot-password`, { data: { identifier: 'client1@example.mn' } });
    const unknown = await request.post(`${API_URL}/auth/forgot-password`, { data: { identifier: 'nobody.at.all@example.mn' } });

    expect(known.status()).toBe(unknown.status());
    expect(await known.json()).toEqual(await unknown.json());
  });

  test('урилгаар бүртгэлээ дуусгаж, өөрийн нууц үгээрээ нэвтэрнэ', async ({ page, request }) => {
    const id = uniqueId();
    const email = `e2e.invite.${id}@lawfirm.mn`;
    const admin = await request.post(`${API_URL}/auth/login`, { data: { identifier: 'admin@lawfirm.mn', password: 'Admin123!' } });
    expect(admin.ok()).toBeTruthy();
    const created = await request.post(`${API_URL}/users`, {
      data: { email, firstName: 'E2E', lastName: 'Урилга', role: 'CLIENT' },
    });
    expect(created.status()).toBe(201);
    const { user } = (await created.json()) as { user: { id: string } };

    const token = issueToken(user.id, 'INVITE', 7 * 86_400_000);
    await token.create();

    await page.goto(`/portal/accept-invite?token=${encodeURIComponent(token.raw)}`);
    await page.getByLabel('Шинэ нууц үг').fill('Invited123');
    await page.getByLabel('Нууц үгээ давтах').fill('Invited123');
    await page.getByRole('button', { name: 'Нууц үг тохируулах' }).click();
    await expect(page.getByRole('main').getByText('Бүртгэл бэлэн боллоо')).toBeVisible();

    expect((await request.post(`${API_URL}/auth/login`, { data: { identifier: email, password: 'Invited123' } })).ok()).toBeTruthy();
  });
});
