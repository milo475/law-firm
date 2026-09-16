/* eslint-disable no-console */
/**
 * Creates (or resets the password of) an ADMIN account — the way the first admin is provisioned
 * on a fresh deployment, where `db:seed` never runs. The e-mail and password go through the same
 * zod rules the app itself uses, and the password is hashed with argon2id, never stored or logged.
 *
 *   pnpm db:admin -- --email admin@lawfirm.mn --password '…'
 *   ADMIN_EMAIL=… ADMIN_PASSWORD=… pnpm db:admin        # nothing sensitive in the shell history
 *
 * Optional: --first, --last, --phone (ADMIN_FIRST_NAME / ADMIN_LAST_NAME / ADMIN_PHONE).
 * An existing user with that e-mail keeps their data and is promoted to an active ADMIN.
 */
import path from 'node:path';
import { config as loadEnv } from 'dotenv';
import argon2 from 'argon2';

loadEnv({ path: [path.resolve(__dirname, '../../../.env'), path.resolve(__dirname, '../.env')] });

import { getPrismaClient } from '../src/db';
import { Role } from '../src/generated/prisma/enums';
import { EmailSchema, PasswordSchema, PhoneSchema } from '../src/schemas/common';
import { databaseNameFromUrl } from '../src/utils/test-data';

const prisma = getPrismaClient();

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? undefined : process.argv[index + 1];
}

function parse<T>(schema: { safeParse: (value: unknown) => { success: boolean; data?: T; error?: { issues: { message: string }[] } } }, value: unknown, label: string): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new Error(`${label}: ${result.error!.issues.map((issue) => issue.message).join(', ')}`);
  return result.data as T;
}

async function main() {
  const email = parse<string>(EmailSchema, arg('email') ?? process.env.ADMIN_EMAIL, '--email');
  const password = parse<string>(PasswordSchema, arg('password') ?? process.env.ADMIN_PASSWORD, '--password');
  const firstName = arg('first') ?? process.env.ADMIN_FIRST_NAME ?? 'Админ';
  const lastName = arg('last') ?? process.env.ADMIN_LAST_NAME ?? 'Системийн';
  const rawPhone = arg('phone') ?? process.env.ADMIN_PHONE;
  const phone = rawPhone ? parse<string>(PhoneSchema, rawPhone, '--phone') : undefined;

  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true, role: true } });
  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash, role: Role.ADMIN, isActive: true, ...(phone ? { phone } : {}) },
    create: { email, phone, passwordHash, firstName, lastName, role: Role.ADMIN },
    select: { id: true, email: true, role: true },
  });

  console.log(`Database: ${databaseNameFromUrl(process.env.DATABASE_URL) ?? 'unknown'}`);
  if (!existing) console.log(`Created ADMIN ${user.email}`);
  else if (existing.role !== Role.ADMIN) console.log(`Promoted ${user.email} from ${existing.role} to ADMIN and set a new password`);
  else console.log(`Reset the password of ADMIN ${user.email}`);
  console.log('Sign in at /portal/login (staff land on /admin).');
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
