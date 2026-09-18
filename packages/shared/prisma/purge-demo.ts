/* eslint-disable no-console */
/**
 * Empties the content tables so a deployment can start on real data: the demo rows `seed.ts`
 * writes (posts, cases, clients, lawyer profiles, invoices, service requests, messages, documents,
 * tasks, notifications) and anything created on top of them.
 *
 *   pnpm db:purge-demo                  # prints what would go and stops
 *   pnpm db:purge-demo --yes            # deletes
 *   pnpm db:purge-demo --yes --with-files   # also deletes the stored files (R2/MinIO)
 *
 * Kept: ADMIN accounts (the real administrator signs in with one) and the firm settings.
 * There is no undo, so nothing is deleted until --yes is passed.
 */
import path from 'node:path';
import { config as loadEnv } from 'dotenv';

loadEnv({ path: [path.resolve(__dirname, '../../../.env'), path.resolve(__dirname, '../.env')] });

import { DeleteObjectsCommand, S3Client } from '@aws-sdk/client-s3';
import { getPrismaClient } from '../src/db';
import { Role } from '../src/generated/prisma/enums';
import { databaseNameFromUrl } from '../src/utils/test-data';

const prisma = getPrismaClient();

interface Options {
  confirmed: boolean;
  withFiles: boolean;
}

function parseArgs(argv: string[]): Options {
  const options: Options = { confirmed: false, withFiles: false };
  for (const arg of argv) {
    if (arg === '--yes') options.confirmed = true;
    else if (arg === '--with-files') options.withFiles = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

/** Every model this script empties, in an order the foreign keys allow. */
const TABLES = [
  'Task',
  'Case',
  'Post',
  'ServiceRequest',
  'ContactRequest',
  'Notification',
  'AuditLog',
  'LawyerProfile',
  'User (LAWYER, CLIENT)',
] as const;

/** Object keys behind the rows that are about to go. */
async function storedObjectKeys(publicBaseUrl: string): Promise<string[]> {
  const [documents, attachments, posts, users] = await Promise.all([
    prisma.document.findMany({ select: { storageKey: true } }),
    prisma.taskAttachment.findMany({ select: { storageKey: true } }),
    prisma.post.findMany({ where: { coverImageUrl: { not: null } }, select: { coverImageUrl: true } }),
    prisma.user.findMany({ where: { role: { not: Role.ADMIN }, avatarUrl: { not: null } }, select: { avatarUrl: true } }),
  ]);
  const keys = [...documents.map((d) => d.storageKey), ...attachments.map((a) => a.storageKey)];
  // Public images are stored as full URLs; only ours can be deleted.
  for (const url of [...posts.map((p) => p.coverImageUrl), ...users.map((u) => u.avatarUrl)]) {
    if (url?.startsWith(`${publicBaseUrl}/`)) keys.push(url.slice(publicBaseUrl.length + 1));
  }
  return [...new Set(keys)];
}

async function deleteObjects(keys: string[]): Promise<number> {
  if (keys.length === 0) return 0;
  const bucket = process.env.R2_BUCKET ?? 'law-firm-documents';
  const client = new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT ?? 'http://localhost:9000',
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
    },
  });
  let deleted = 0;
  for (let i = 0; i < keys.length; i += 1000) {
    const chunk = keys.slice(i, i + 1000);
    const result = await client.send(
      new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: chunk.map((Key) => ({ Key })), Quiet: true } }),
    );
    deleted += chunk.length - (result.Errors?.length ?? 0);
    for (const error of result.Errors ?? []) console.warn(`  could not delete ${error.Key}: ${error.Message}`);
  }
  return deleted;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const database = databaseNameFromUrl(process.env.DATABASE_URL);
  if (!database) throw new Error('DATABASE_URL is not set or has no database name');

  const [users, admins, counts] = await Promise.all([
    prisma.user.count({ where: { role: { not: Role.ADMIN } } }),
    prisma.user.findMany({ where: { role: Role.ADMIN }, select: { email: true } }),
    Promise.all([
      prisma.task.count(),
      prisma.case.count(),
      prisma.post.count(),
      prisma.serviceRequest.count(),
      prisma.contactRequest.count(),
      prisma.notification.count(),
      prisma.auditLog.count(),
      prisma.lawyerProfile.count(),
    ]),
  ]);
  const rows = [...counts, users];
  const total = rows.reduce((sum, count) => sum + count, 0);
  const publicBaseUrl = (process.env.R2_PUBLIC_URL ?? '').replace(/\/+$/, '');
  const fileKeys = options.withFiles ? await storedObjectKeys(publicBaseUrl) : [];

  console.log(`Database: ${database}`);
  console.log('To delete:');
  const width = Math.max(...TABLES.map((table) => table.length));
  TABLES.forEach((table, index) => console.log(`  ${table.padEnd(width)}  ${rows[index]}`));
  if (options.withFiles) console.log(`  ${'stored files'.padEnd(width)}  ${fileKeys.length}`);
  console.log(`Kept: ${admins.length} ADMIN account(s) — ${admins.map((a) => a.email).join(', ') || 'none'} — and the firm settings.`);
  if (!options.withFiles) console.log('Stored files are left in place (pass --with-files to delete them too).');

  if (!options.confirmed) {
    console.log(`\nNothing was deleted. Re-run with --yes to remove these ${total} rows.`);
    return;
  }

  // Children before parents; Case → its events, documents, requests, messages, invoices and members cascade.
  const deleted: [string, number][] = [
    ['Task', (await prisma.task.deleteMany({})).count],
    ['Case', (await prisma.case.deleteMany({})).count],
    ['Post', (await prisma.post.deleteMany({})).count],
    ['ServiceRequest', (await prisma.serviceRequest.deleteMany({})).count],
    ['ContactRequest', (await prisma.contactRequest.deleteMany({})).count],
    ['Notification', (await prisma.notification.deleteMany({})).count],
    ['AuditLog', (await prisma.auditLog.deleteMany({})).count],
    ['LawyerProfile', (await prisma.lawyerProfile.deleteMany({})).count],
    ['User', (await prisma.user.deleteMany({ where: { role: { not: Role.ADMIN } } })).count],
  ];
  if (options.withFiles) deleted.push(['stored files', await deleteObjects(fileKeys)]);

  console.log('\nDeleted:');
  for (const [table, count] of deleted) console.log(`  ${table.padEnd(width)}  ${count}`);
  console.log('Done.');
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
